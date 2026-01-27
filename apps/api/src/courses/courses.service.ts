import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

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

  async findNearby(params: { lat: number; lon: number; radiusM: number }) {
    const { lat, lon } = params;
    const radiusM = Math.max(1000, Math.min(200000, params.radiusM || 50000));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new BadRequestException("Invalid lat/lon");
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
        c."lat" BETWEEN ${minLat} AND ${maxLat}
        AND c."lon" BETWEEN ${minLon} AND ${maxLon}
      ORDER BY "distanceM" ASC
    `);

    const items = rows.filter((r) => r.distanceM <= radiusM);

    return {
      count: items.length,
      items,
    };
  }
}
