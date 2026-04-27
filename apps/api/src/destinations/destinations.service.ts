import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Visibility } from '@prisma/client';

const DEFAULT_DESTINATIONS = [
  { code: 'TH', name: 'Thailand', slug: 'thailand' },
  { code: 'VN', name: 'Vietnam', slug: 'vietnam' },
  { code: 'PT', name: 'Portugal', slug: 'portugal' },
  { code: 'ES', name: 'Spain', slug: 'spain' },
  { code: 'TR', name: 'Turkey', slug: 'turkey' },
  { code: 'AE', name: 'United Arab Emirates', slug: 'united-arab-emirates' },
  { code: 'CH', name: 'Switzerland', slug: 'switzerland' },
  { code: 'DE', name: 'Germany', slug: 'germany' },
  { code: 'AT', name: 'Austria', slug: 'austria' },
  { code: 'FR', name: 'France', slug: 'france' },
  { code: 'IT', name: 'Italy', slug: 'italy' },
  { code: 'JP', name: 'Japan', slug: 'japan' },
  { code: 'US', name: 'United States', slug: 'united-states' },
];

@Injectable()
export class DestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaultDestinations() {
    await Promise.all(
      DEFAULT_DESTINATIONS.map((destination) =>
        this.prisma.destination.upsert({
          where: { code: destination.code },
          update: {
            name: destination.name,
            slug: destination.slug,
            isActive: true,
          },
          create: destination,
        }),
      ),
    );
  }

  async findAll() {
    await this.ensureDefaultDestinations();

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
    await this.ensureDefaultDestinations();

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
    await this.ensureDefaultDestinations();

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
    await this.ensureDefaultDestinations();

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
    await this.ensureDefaultDestinations();

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
    await this.ensureDefaultDestinations();

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
