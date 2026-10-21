import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, GolfServiceCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  GolfServicesRegionQueryDto, NearbyGolfServicesQueryDto,
} from './golf-services.dto';
import { golfServiceBoundingBox, golfServiceDistanceKm } from './golf-services.geo';

const VERIFIED = 'VERIFIED' as const;

// Public response has neither internal review notes, Google IDs nor private source metadata.
const publicVenueSelect = {
  id: true,
  name: true,
  country: true,
  region: true,
  city: true,
  postalCode: true,
  addressLine: true,
  lat: true,
  lon: true,
  website: true,
  phone: true,
  offerings: {
    where: { status: VERIFIED, verifiedAt: { not: null } },
    select: {
      id: true, category: true, label: true, description: true,
      unitCount: true, availableToPublic: true, bookingUrl: true,
    },
  },
  venueProviders: {
    where: { status: VERIFIED, verifiedAt: { not: null } },
    select: {
      role: true,
      provider: { select: { id: true, name: true, kind: true, website: true } },
    },
  },
} satisfies Prisma.GolfServiceVenueSelect;

function verifiedOffering(category?: GolfServiceCategory): Prisma.GolfServiceOfferingWhereInput {
  return {
    status: VERIFIED,
    verifiedAt: { not: null },
    ...(category ? { category } : {}),
  };
}

@Injectable()
export class GolfServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertEnabled() {
    // No queries against un-migrated tables when this feature is not enabled.
    if (process.env.GOLF_SERVICES_API_ENABLED !== 'true') {
      throw new ServiceUnavailableException('Golf Services API is not enabled yet');
    }
  }

  async nearby(query: NearbyGolfServicesQueryDto) {
    this.assertEnabled();
    const { lat, lon, category, country } = query;
    const radiusKm = query.radiusKm ?? 25;
    const bounds = golfServiceBoundingBox(lat, lon, radiusKm);
    const where: Prisma.GolfServiceVenueWhereInput = {
      status: VERIFIED,
      verifiedAt: { not: null },
      lat: { gte: bounds.minLat, lte: bounds.maxLat },
      ...(country ? { country } : {}),
      offerings: { some: verifiedOffering(category) },
    };

    // Longitude bounds may wrap from +180 to -180 (or the reverse).
    if (!bounds.allLongitudes) {
      if (bounds.west < -180) {
        where.OR = [
          { lon: { gte: bounds.west + 360 } },
          { lon: { lte: bounds.east } },
        ];
      } else if (bounds.east > 180) {
        where.OR = [
          { lon: { gte: bounds.west } },
          { lon: { lte: bounds.east - 360 } },
        ];
      } else {
        where.lon = { gte: bounds.west, lte: bounds.east };
      }
    }

    const rows = await this.prisma.golfServiceVenue.findMany({
      where,
      select: publicVenueSelect,
    });

    const sorted = rows.flatMap((venue) => {
      if (venue.lat === null || venue.lon === null) return [];
      const km = golfServiceDistanceKm(lat, lon, venue.lat, venue.lon);
      if (km > radiusKm) return [];
      const offerings = category
        ? venue.offerings.filter((offering) => offering.category === category)
        : venue.offerings;
      return [{
        ...venue,
        offerings,
        distanceKm: Math.round(km * 10) / 10,
      }];
    }).sort((a, b) =>
      a.distanceKm - b.distanceKm || a.name.localeCompare(b.name),
    );

    return {
      count: sorted.length,
      radiusKm,
      truncated: sorted.length > 100,
      items: sorted.slice(0, 100),
    };
  }

  async byRegion(query: GolfServicesRegionQueryDto) {
    this.assertEnabled();
    const { country, region, category } = query;
    const take = query.take ?? 50;
    const where: Prisma.GolfServiceVenueWhereInput = {
      country,
      ...(region ? { region: { equals: region, mode: 'insensitive' } } : {}),
      status: VERIFIED,
      verifiedAt: { not: null },
      offerings: { some: verifiedOffering(category) },
    };

    const rows = await this.prisma.golfServiceVenue.findMany({
      where,
      select: publicVenueSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: take + 1,
    });
    const truncated = rows.length > take;

    return {
      count: Math.min(rows.length, take),
      truncated,
      items: rows.slice(0, take).map((venue) => ({
        ...venue,
        offerings: category
          ? venue.offerings.filter((offering) => offering.category === category)
          : venue.offerings,
      })),
    };
  }
}
