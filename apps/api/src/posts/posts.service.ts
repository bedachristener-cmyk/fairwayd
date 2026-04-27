import {
  BadRequestException,
  UnauthorizedException,
  Injectable,
} from '@nestjs/common';
import { Prisma, Visibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreatePostBody = {
  courseId: string;
  content: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
};

type UpdatePostBody = {
  content?: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
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
  async getPublicFeed(params?: {
    take?: number;
    cursor?: string;
    userId?: string;
  }) {
    const take = Math.max(1, Math.min(100, params?.take ?? 50));
    const cursor = params?.cursor?.trim();
    const userId = params?.userId?.trim();

    let followedDestinationCodes: string[] = [];

    if (userId) {
      const followedDestinations = await this.prisma.destinationFollow.findMany(
        {
          where: { userId },
          select: {
            destination: {
              select: {
                code: true,
              },
            },
          },
        },
      );

      followedDestinationCodes = followedDestinations
        .map((d) => d.destination?.code)
        .filter((code): code is string => !!code);
    }

    let followingUserIds = new Set<string>();
    let followingCourseIds = new Set<string>();
    let followingDestinationCodesSet = new Set<string>();

    if (userId) {
      const follows = await this.prisma.follow.findMany({
        where: {
          followerId: userId,
          status: 'ACCEPTED',
        },
        select: {
          followingId: true,
        },
      });

      followingUserIds = new Set(follows.map((f) => f.followingId));

      const courseFollows = await this.prisma.courseFollow.findMany({
        where: {
          userId,
        },
        select: {
          courseId: true,
        },
      });

      followingCourseIds = new Set(courseFollows.map((c) => c.courseId));
      followingDestinationCodesSet = new Set(followedDestinationCodes);
    }

    const query: Prisma.PostFindManyArgs = {
      where: userId
        ? {
            OR: [
              // Eigene Posts -> alle Sichtbarkeiten
              {
                userId,
              },

              // Gefolgte User -> nur PUBLIC
              {
                user: {
                  followers: {
                    some: {
                      followerId: userId,
                      status: 'ACCEPTED',
                    },
                  },
                },
                visibility: Visibility.PUBLIC,
              },

              // Gefolgte User -> nur FOLLOWERS
              {
                user: {
                  followers: {
                    some: {
                      followerId: userId,
                      status: 'ACCEPTED',
                    },
                  },
                },
                visibility: Visibility.FOLLOWERS,
              },

              // Gefolgte Courses -> nur PUBLIC
              {
                course: {
                  followers: {
                    some: {
                      userId,
                    },
                  },
                },
                visibility: Visibility.PUBLIC,
              },

              // Gefolgte Destinations -> nur PUBLIC
              {
                visibility: Visibility.PUBLIC,
                course: {
                  country: {
                    in: followedDestinationCodes,
                  },
                },
              },
            ],
          }
        : { visibility: Visibility.PUBLIC },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        course: true,
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
        images: true,
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const rawItems = await this.prisma.post.findMany(query);

    const items = rawItems.filter((p: any) => {
      // eigene Posts -> immer erlaubt
      if (p.userId === userId) {
        return true;
      }

      // ohne Login -> nur PUBLIC
      if (!userId) {
        return p.visibility === Visibility.PUBLIC;
      }

      const followsAuthor = followingUserIds.has(p.userId);
      const followsCourse = followingCourseIds.has(p.courseId);
      const followsDestination =
        !!p.course?.country &&
        followingDestinationCodesSet.has(p.course.country);

      // fremde PRIVATE Posts -> NIE erlaubt
      if (p.visibility === Visibility.PRIVATE) {
        return false;
      }

      // fremde FOLLOWERS Posts -> nur wenn Autor gefolgt
      if (p.visibility === Visibility.FOLLOWERS) {
        return followsAuthor;
      }

      // PUBLIC Posts
      if (p.visibility === Visibility.PUBLIC) {
        return followsAuthor || followsCourse || followsDestination;
      }

      return false;
    });

    const nextCursor =
      items.length === take ? items[items.length - 1]?.id : null;

    const enrichedItems = items.map((p: any) => {
      const isSelf = p.userId === userId;
      const isFriend = followingUserIds.has(p.userId);
      const isCourse = followingCourseIds.has(p.courseId);
      const isDestination =
        !!p.course?.country &&
        followingDestinationCodesSet.has(p.course.country);

      return {
        ...p,
        feedContext: {
          isSelf,
          isFriend,
          isCourse,
          isDestination,
        },
      };
    });

    return { items: enrichedItems, nextCursor, take };
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
    userId?: string;
  }) {
    const courseId = params?.courseId?.trim();
    const take = Math.max(1, Math.min(100, params?.take ?? 50));
    const cursor = params?.cursor?.trim();
    const userId = params?.userId?.trim();

    if (!courseId) {
      throw new BadRequestException('Missing courseId');
    }

    const query: Prisma.PostFindManyArgs = {
      where: userId
        ? {
            courseId,
            OR: [
              { visibility: Visibility.PUBLIC },
              {
                userId,
                visibility: Visibility.PRIVATE,
              },
              {
                userId,
                visibility: Visibility.FOLLOWERS,
              },
              {
                visibility: Visibility.FOLLOWERS,
                user: {
                  followers: {
                    some: {
                      followerId: userId,
                      status: 'ACCEPTED',
                    },
                  },
                },
              },
            ],
          }
        : {
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
            name: true,
            avatarUrl: true,
          },
        },
        images: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
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
   * - supports optional imageUrls -> creates PostImage rows
   */
  async createPost(
    userId: string,
    body: CreatePostBody,
    imageUrls: string[] = [],
  ) {
    const uid = userId?.trim();
    const courseId = body?.courseId?.trim();
    const content = body?.content?.trim();
    const validImageUrls = imageUrls.filter((url) => url.trim().length > 0);

    if (!uid) throw new BadRequestException('Missing userId');
    if (!courseId) throw new BadRequestException('Missing courseId');
    if (!content && validImageUrls.length === 0) {
      throw new BadRequestException('Missing content');
    }

    const visibility =
      body?.visibility === 'PRIVATE'
        ? Visibility.PRIVATE
        : body?.visibility === 'FOLLOWERS'
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
          images: validImageUrls.length
            ? {
                create: validImageUrls.map((url) => ({ url })),
              }
            : undefined,
        },
        include: {
          course: true,
          user: {
            select: {
              id: true,
              handle: true,
              name: true,
              avatarUrl: true,
            },
          },
          images: true,
        },
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Failed to create post');
    }
  }

  async updatePost(postId: string, userId: string, body: UpdatePostBody) {
    const pid = postId?.trim();
    const uid = userId?.trim();

    if (!pid) throw new BadRequestException('Missing postId');
    if (!uid) throw new BadRequestException('Missing userId');

    const post = await this.prisma.post.findUnique({
      where: { id: pid },
      select: { id: true, userId: true },
    });

    if (!post) {
      throw new BadRequestException(`Unknown postId ${pid}`);
    }

    if (post.userId !== uid) {
      throw new UnauthorizedException('You can only edit your own posts');
    }

    const data: Prisma.PostUpdateInput = {};

    if (typeof body?.content === 'string') {
      const trimmedContent = body.content.trim();
      data.content = trimmedContent;
    }

    if (typeof body?.visibility === 'string') {
      data.visibility =
        body.visibility === 'PRIVATE'
          ? Visibility.PRIVATE
          : body.visibility === 'FOLLOWERS'
            ? Visibility.FOLLOWERS
            : Visibility.PUBLIC;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    if (
      Object.prototype.hasOwnProperty.call(data, 'content') &&
      !data.content &&
      body?.visibility === undefined
    ) {
      throw new BadRequestException('Content cannot be empty');
    }

    return this.prisma.post.update({
      where: { id: pid },
      data,
      include: {
        course: true,
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
        images: true,
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
  }

  async deletePost(postId: string, userId: string) {
    const pid = postId?.trim();
    const uid = userId?.trim();

    if (!pid) throw new BadRequestException('Missing postId');
    if (!uid) throw new BadRequestException('Missing userId');

    const post = await this.prisma.post.findUnique({
      where: { id: pid },
      select: { id: true, userId: true },
    });

    if (!post) {
      throw new BadRequestException(`Unknown postId ${pid}`);
    }

    if (post.userId !== uid) {
      throw new UnauthorizedException('You can only delete your own posts');
    }

    await this.prisma.post.delete({
      where: { id: pid },
    });

    return { ok: true, id: pid };
  }

  async likePost(postId: string, userId: string) {
    const pid = postId?.trim();
    const uid = userId?.trim();

    if (!pid) throw new BadRequestException('Missing postId');
    if (!uid) throw new BadRequestException('Missing userId');

    const post = await this.prisma.post.findUnique({
      where: { id: pid },
      select: { id: true },
    });

    if (!post) {
      throw new BadRequestException(`Unknown postId ${pid}`);
    }

    await this.prisma.like.upsert({
      where: {
        postId_userId: {
          postId: pid,
          userId: uid,
        },
      },
      update: {},
      create: {
        postId: pid,
        userId: uid,
      },
    });

    return { ok: true };
  }

  async unlikePost(postId: string, userId: string) {
    const pid = postId?.trim();
    const uid = userId?.trim();

    if (!pid) throw new BadRequestException('Missing postId');
    if (!uid) throw new BadRequestException('Missing userId');

    await this.prisma.like.deleteMany({
      where: {
        postId: pid,
        userId: uid,
      },
    });

    return { ok: true };
  }
  async toggleCommentLike(commentId: string, userId: string) {
    const cid = commentId?.trim();
    const uid = userId?.trim();

    if (!cid) {
      throw new BadRequestException('Missing commentId');
    }

    if (!uid) {
      throw new UnauthorizedException('Missing userId');
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: cid },
      select: { id: true },
    });

    if (!comment) {
      throw new BadRequestException(`Unknown commentId ${cid}`);
    }

    const existing = await this.prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId: cid,
          userId: uid,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.commentLike.delete({
        where: {
          commentId_userId: {
            commentId: cid,
            userId: uid,
          },
        },
      });

      return { liked: false };
    }

    await this.prisma.commentLike.create({
      data: {
        commentId: cid,
        userId: uid,
      },
    });

    return { liked: true };
  }

  async getComments(postId: string, userId?: string) {
    const pid = postId?.trim();

    if (!pid) {
      throw new BadRequestException('Missing postId');
    }

    const post = await this.prisma.post.findUnique({
      where: { id: pid },
      select: { id: true },
    });

    if (!post) {
      throw new BadRequestException(`Unknown postId ${pid}`);
    }

    const comments = await this.prisma.comment.findMany({
      where: { postId: pid },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    const byId = new Map<
      string,
      (typeof comments)[number] & { replies: any[] }
    >();

    for (const comment of comments) {
      const likedByMe =
        !!userId && comment.likes.some((l) => l.userId === userId);

      byId.set(comment.id, {
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        parentId: comment.parentId,
        content: comment.content,
        createdAt: comment.createdAt,
        user: comment.user,
        _count: comment._count,
        likedByMe,
        replies: [],
      } as any); // 👈 DAS HINZUFÜGEN
    }
    const roots: Array<(typeof comments)[number] & { replies: any[] }> = [];

    for (const comment of comments) {
      const node = byId.get(comment.id)!;

      if (comment.parentId) {
        const parent = byId.get(comment.parentId);
        if (parent) {
          parent.replies.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async createComment(
    postId: string,
    userId: string,
    content: string,
    parentId?: string,
  ) {
    const pid = postId?.trim();
    const uid = userId?.trim();
    const text = content?.trim();
    const parent = parentId?.trim();

    if (!pid) throw new BadRequestException('Missing postId');
    if (!uid) throw new BadRequestException('Missing userId');
    if (!text) throw new BadRequestException('Missing content');

    const post = await this.prisma.post.findUnique({
      where: { id: pid },
      select: { id: true },
    });

    if (!post) {
      throw new BadRequestException(`Unknown postId ${pid}`);
    }

    if (parent) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parent },
        select: { id: true, postId: true },
      });

      if (!parentComment) {
        throw new BadRequestException(`Unknown parentId ${parent}`);
      }

      if (parentComment.postId !== pid) {
        throw new BadRequestException('Parent comment belongs to another post');
      }
    }

    return this.prisma.comment.create({
      data: {
        postId: pid,
        userId: uid,
        content: text,
        parentId: parent || null,
      },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}
