import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Visibility } from '@prisma/client';

type CreatePostBody = {
  courseId: string;
  content: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS';
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public feed (only PUBLIC posts)
   * - newest first
   * - includes course + user (basic fields) + images
   * - supports cursor pagination
   */
  async getPublicFeed(params?: { take?: number; cursor?: string }) {
    const take = Math.max(1, Math.min(100, params?.take ?? 50));
    const cursor = params?.cursor?.trim();

    const query: Prisma.PostFindManyArgs = {
      where: { visibility: Visibility.PUBLIC },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        course: true,
        user: {
          select: {
            id: true,
            handle: true,
          },
        },
        images: true,
      },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1; // skip the cursor item itself
    }

    const items = await this.prisma.post.findMany(query);

    const nextCursor =
      items.length === take ? items[items.length - 1]?.id : null;

    return { items, nextCursor, take };
  }

  /**
   * Public posts for a specific course
   * - returns SAME shape as feed: { items, nextCursor, take }
   * - supports cursor pagination
   */
  async getPostsByCourse(params: {
    courseId: string;
    take?: number;
    cursor?: string;
  }) {
    const courseId = params?.courseId?.trim();
    const take = Math.max(1, Math.min(100, params?.take ?? 50));
    const cursor = params?.cursor?.trim();

    if (!courseId) {
      throw new BadRequestException('Missing courseId');
    }

    const query: Prisma.PostFindManyArgs = {
      where: {
        courseId,
        visibility: Visibility.PUBLIC,
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        course: true,
        user: {
          select: {
            id: true,
            handle: true,
          },
        },
        images: true,
      },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const items = await this.prisma.post.findMany(query);
    const nextCursor =
      items.length === take ? items[items.length - 1]?.id : null;

    return { items, nextCursor, take };
  }

  /**
   * Posts for the current user
   */
  async getMyPosts(userId: string, take = 50) {
    const t = Math.max(1, Math.min(100, take));

    if (!userId?.trim()) {
      throw new BadRequestException('Missing userId');
    }

    return this.prisma.post.findMany({
      where: { userId: userId.trim() },
      orderBy: { createdAt: 'desc' },
      take: t,
      include: {
        course: true,
        images: true,
      },
    });
  }

  /**
   * Create a post (auth required)
   * - supports optional imageUrl -> creates PostImage row
   */
  async createPost(userId: string, body: CreatePostBody, imageUrl?: string) {
    const uid = userId?.trim();
    const courseId = body?.courseId?.trim();
    const content = body?.content?.trim();

    if (!uid) throw new BadRequestException('Missing userId');
    if (!courseId) throw new BadRequestException('Missing courseId');
    if (!content && !imageUrl) {
      throw new BadRequestException('Missing content');
    }

    const visibility =
      body?.visibility === 'FOLLOWERS'
        ? Visibility.FOLLOWERS
        : Visibility.PUBLIC;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      throw new BadRequestException(`Unknown courseId ${courseId}`);
    }

    try {
      return await this.prisma.post.create({
        data: {
          userId: uid,
          courseId,
          content: content ?? '',
          visibility,
          images: imageUrl
            ? {
                create: [{ url: imageUrl }],
              }
            : undefined,
        },
        include: {
          course: true,
          user: {
            select: {
              id: true,
              handle: true,
            },
          },
          images: true,
        },
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Failed to create post');
    }
  }
}
