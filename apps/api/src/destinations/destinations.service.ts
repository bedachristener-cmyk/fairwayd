import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Visibility } from '@prisma/client';

@Injectable()
export class DestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const destinations = await this.prisma.destination.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
      },
    });

    const items = await Promise.all(
      destinations.map(async (destination) => {
        const courseCount = await this.prisma.course.count({
          where: {
            country: destination.code,
          },
        });

        return {
          ...destination,
          courseCount,
        };
      }),
    );

    return { items };
  }

  async findBySlug(slug: string) {
    const destination = await this.prisma.destination.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
      },
    });

    if (!destination) {
      return null;
    }

    const courseCount = await this.prisma.course.count({
      where: {
        country: destination.code,
      },
    });

    const followerCount = await this.prisma.destinationFollow.count({
      where: {
        destinationId: destination.id,
      },
    });

    return {
      ...destination,
      courseCount,
      followerCount,
    };
  }

  async getPostsBySlug(slug: string, userId?: string) {
    const destination = await this.prisma.destination.findUnique({
      where: { slug },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    let followingUserIds: string[] = [];

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

      followingUserIds = follows.map((f) => f.followingId);
    }

    const items = await this.prisma.post.findMany({
      where: userId
        ? {
            course: {
              country: destination.code,
            },
            OR: [
              {
                visibility: Visibility.PUBLIC,
              },
              {
                userId,
              },
              {
                visibility: Visibility.FOLLOWERS,
                userId: {
                  in: followingUserIds,
                },
              },
            ],
          }
        : {
            course: {
              country: destination.code,
            },
            visibility: Visibility.PUBLIC,
          },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
            privacy: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            country: true,
            region: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
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
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return {
      destination: {
        id: destination.id,
        code: destination.code,
        name: destination.name,
        slug: destination.slug,
      },
      items,
    };
  }

  async followDestination(userId: string, slug: string) {
    const destination = await this.prisma.destination.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
      },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    await this.prisma.destinationFollow.upsert({
      where: {
        userId_destinationId: {
          userId,
          destinationId: destination.id,
        },
      },
      update: {},
      create: {
        userId,
        destinationId: destination.id,
      },
    });

    const followerCount = await this.prisma.destinationFollow.count({
      where: {
        destinationId: destination.id,
      },
    });

    return {
      ok: true,
      following: true,
      followerCount,
      destination: {
        id: destination.id,
        code: destination.code,
        name: destination.name,
        slug: destination.slug,
      },
    };
  }

  async unfollowDestination(userId: string, slug: string) {
    const destination = await this.prisma.destination.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
      },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    await this.prisma.destinationFollow.deleteMany({
      where: {
        userId,
        destinationId: destination.id,
      },
    });

    const followerCount = await this.prisma.destinationFollow.count({
      where: {
        destinationId: destination.id,
      },
    });

    return {
      ok: true,
      following: false,
      followerCount,
      destination: {
        id: destination.id,
        code: destination.code,
        name: destination.name,
        slug: destination.slug,
      },
    };
  }

  async getFollowStatus(userId: string, slug: string) {
    const destination = await this.prisma.destination.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
      },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    const follow = await this.prisma.destinationFollow.findUnique({
      where: {
        userId_destinationId: {
          userId,
          destinationId: destination.id,
        },
      },
      select: {
        id: true,
      },
    });

    const followerCount = await this.prisma.destinationFollow.count({
      where: {
        destinationId: destination.id,
      },
    });

    return {
      following: !!follow,
      followerCount,
      destination: {
        id: destination.id,
        code: destination.code,
        name: destination.name,
        slug: destination.slug,
      },
    };
  }
}
