import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.course.findMany();
  }

  async getById(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
    });
  }

  // ------------------------------------------------------------
  // Typeahead search for dropdown (q + optional filters)
  // ------------------------------------------------------------
  async search(params: {
    q: string;
    country?: string;
    region?: string;
    take: number;
  }) {
    const q = (params.q || '').trim();
    const take = Math.max(5, Math.min(50, params.take || 20));

    if (q.length < 2) {
      return { items: [] };
    }

    const items = await this.prisma.course.findMany({
      where: {
        AND: [
          { active: true },
          params.country ? { country: params.country } : {},
          params.region ? { region: params.region } : {},
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        city: true,
        postalCode: true,
        region: true,
        country: true,
        lat: true,
        lon: true,
        holes: true,
        access: true,
        website: true,
      },
    });

    return { items };
  }

  // ------------------------------------------------------------
  // Courses in current map bounds (rectangle)
  // ------------------------------------------------------------
  async inBounds(params: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    country?: string;
    region?: string;
    take: number;
  }) {
    const minLat = Math.min(params.minLat, params.maxLat);
    const maxLat = Math.max(params.minLat, params.maxLat);
    const minLon = Math.min(params.minLon, params.maxLon);
    const maxLon = Math.max(params.minLon, params.maxLon);

    const take = Math.max(50, Math.min(5000, params.take || 1000));

    if (
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLat) ||
      !Number.isFinite(minLon) ||
      !Number.isFinite(maxLon)
    ) {
      throw new BadRequestException('Invalid bounds');
    }

    const items = await this.prisma.course.findMany({
      where: {
        AND: [
          { active: true },
          params.country ? { country: params.country } : {},
          params.region ? { region: params.region } : {},
          { lat: { gte: minLat, lte: maxLat } },
          { lon: { gte: minLon, lte: maxLon } },
        ],
      },
      take,
      select: {
        id: true,
        name: true,
        lat: true,
        lon: true,
        country: true,
        region: true,
        holes: true,
        access: true,
      },
    });

    return { items };
  }

  async findNearby(params: { lat: number; lon: number; radiusM: number }) {
    const { lat, lon } = params;
    const radiusM = Math.max(1000, Math.min(200000, params.radiusM || 50000));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new BadRequestException('Invalid lat/lon');
    }

    const latRadius = radiusM / 111_320;
    const lonRadius = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));

    const minLat = lat - latRadius;
    const maxLat = lat + latRadius;
    const minLon = lon - lonRadius;
    const maxLon = lon + lonRadius;

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        city: string | null;
        postalCode: string | null;
        region: string | null;
        country: string;
        lat: number;
        lon: number;
        distanceM: number;
      }>
    >(Prisma.sql`
      SELECT
        c."id",
        c."name",
        c."city",
        c."postalCode",
        c."region",
        c."country",
        c."lat",
        c."lon",
        (
          2 * 6371000 * asin(
            sqrt(
              power(sin(radians((${lat} - c."lat") / 2)), 2) +
              cos(radians(c."lat")) * cos(radians(${lat})) *
              power(sin(radians((${lon} - c."lon") / 2)), 2)
            )
          )
        ) AS "distanceM"
      FROM "Course" c
      WHERE
        c."active" = true
        AND c."lat" BETWEEN ${minLat} AND ${maxLat}
        AND c."lon" BETWEEN ${minLon} AND ${maxLon}
      ORDER BY "distanceM" ASC
    `);

    const items = rows.filter((r) => r.distanceM <= radiusM);

    return {
      count: items.length,
      items,
    };
  }

  // ------------------------------------------------------------
  // Course Follow
  // ------------------------------------------------------------

  async isFollowingCourse(userId: string, courseId: string) {
    const row = await this.prisma.courseFollow.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
      select: { id: true },
    });
    return !!row;
  }

  async followCourse(userId: string, courseId: string) {
    // idempotent follow
    await this.prisma.courseFollow.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: { userId, courseId },
    });
  }

  async unfollowCourse(userId: string, courseId: string) {
    // idempotent unfollow (avoid throwing if not found)
    await this.prisma.courseFollow.deleteMany({
      where: { userId, courseId },
    });
  }

  async listFollowedCourses(userId: string) {
    const rows = await this.prisma.courseFollow.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            lat: true,
            lon: true,
            city: true,
            country: true,
            region: true,
            postalCode: true,
            website: true,
            holes: true,
            access: true,
          },
        },
      },
    });

    return rows.map((r) => r.course);
  }

  async listCountries() {
    const rows = await this.prisma.course.groupBy({
      by: ['country'],
      where: {
        active: true,
        country: {
          not: '',
        },
      },
      _count: {
        country: true,
      },
      orderBy: {
        country: 'asc',
      },
    });

    return {
      items: rows.map((row) => ({
        country: row.country,
        courseCount: row._count.country,
      })),
    };
  }

  async getByCountry(country: string) {
    const normalizedCountry = (country || '').trim().toUpperCase();

    if (!normalizedCountry) {
      throw new BadRequestException('Country is required');
    }

    const items = await this.prisma.course.findMany({
      where: {
        active: true,
        country: normalizedCountry,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        city: true,
        region: true,
        country: true,
        lat: true,
        lon: true,
        holes: true,
        access: true,
        website: true,
      },
    });

    return {
      country: normalizedCountry,
      courseCount: items.length,
      items,
    };
  }
}
