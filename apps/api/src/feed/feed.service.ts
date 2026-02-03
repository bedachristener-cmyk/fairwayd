import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async getCourseFeed(userId: string) {
    // 1) follower scope: me + following
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const ids = [userId, ...following.map((f) => f.followingId)];

    // 2) get recent posts (a bit more than needed, then dedup by course)
    const posts = await this.prisma.post.findMany({
      where: { userId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        courseId: true,
        content: true,
        createdAt: true,
        user: {
          select: { id: true, handle: true, name: true, avatarUrl: true },
        },
      },
    });

    // 3) dedup by courseId (keep newest)
    const seen = new Set<string>();
    const latestByCourse: Array<{
      courseId: string;
      lastPost: {
        id: string;
        content: string;
        createdAt: Date;
        user: {
          id: string;
          handle: string | null;
          name: string | null;
          avatarUrl: string | null;
        };
      };
    }> = [];

    for (const p of posts) {
      if (!p.courseId) continue;
      if (seen.has(p.courseId)) continue;
      seen.add(p.courseId);

      latestByCourse.push({
        courseId: p.courseId,
        lastPost: {
          id: p.id,
          content: p.content,
          createdAt: p.createdAt,
          user: p.user,
        },
      });

      if (latestByCourse.length >= 50) break;
    }

    const courseIds = latestByCourse.map((x) => x.courseId);

    // 4) load courses (need lat/lon for zoom)
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: {
        id: true,
        name: true,
        city: true,
        region: true,
        country: true,
        lat: true,
        lon: true,
      },
    });

    const courseMap = new Map(courses.map((c) => [c.id, c]));

    // 5) merge to output
    return latestByCourse
      .map((x) => {
        const c = courseMap.get(x.courseId);
        if (!c) return null;
        return {
          courseId: c.id,
          courseName: c.name,
          city: c.city,
          region: c.region,
          country: c.country,
          lat: c.lat,
          lon: c.lon,
          lastPost: x.lastPost,
        };
      })
      .filter(Boolean);
  }
}
