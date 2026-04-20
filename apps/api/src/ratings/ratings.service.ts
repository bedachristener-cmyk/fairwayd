import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UpsertRatingInput = {
  overall: number;
  condition?: number | null;
  layout?: number | null;
  scenery?: number | null;
  value?: number | null;
};

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertRating(
    userId: string,
    courseId: string,
    data: UpsertRatingInput,
  ) {
    return this.prisma.courseRating.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      update: {
        overall: data.overall,
        condition: data.condition ?? null,
        layout: data.layout ?? null,
        scenery: data.scenery ?? null,
        value: data.value ?? null,
      },
      create: {
        userId,
        courseId,
        overall: data.overall,
        condition: data.condition ?? null,
        layout: data.layout ?? null,
        scenery: data.scenery ?? null,
        value: data.value ?? null,
      },
    });
  }

  async getMyRating(userId: string, courseId: string) {
    const rating = await this.prisma.courseRating.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    console.log('ratings service debug', {
      userId,
      courseId,
      found: !!rating,
      rating,
    });

    return rating;
  }

  async getCourseSummary(courseId: string) {
    const ratings = await this.prisma.courseRating.findMany({
      where: { courseId },
    });

    if (!ratings.length) {
      return null;
    }

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    const withFallback = (
      values: Array<number | null>,
      fallbackValues: number[],
    ) => values.map((value, index) => value ?? fallbackValues[index]);

    const overallValues = ratings.map((r) => r.overall);

    return {
      overall: average(overallValues),
      count: ratings.length,
      breakdown: {
        condition: average(
          withFallback(
            ratings.map((r) => r.condition),
            overallValues,
          ),
        ),
        layout: average(
          withFallback(
            ratings.map((r) => r.layout),
            overallValues,
          ),
        ),
        scenery: average(
          withFallback(
            ratings.map((r) => r.scenery),
            overallValues,
          ),
        ),
        value: average(
          withFallback(
            ratings.map((r) => r.value),
            overallValues,
          ),
        ),
      },
    };
  }
}
