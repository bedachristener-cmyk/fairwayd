import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  { code: 'PH', name: 'Philippines', slug: 'philippines' },
  { code: 'US', name: 'United States', slug: 'united-states' },
  { code: 'ZA', name: 'South Africa', slug: 'south-africa' },
];

@Injectable()
export class DestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaultDestinations() {
    try {
      const existing = await this.prisma.destination.findMany({
        where: {
          code: {
            in: DEFAULT_DESTINATIONS.map((destination) => destination.code),
          },
        },
        select: {
          code: true,
        },
      });

      const existingCodes = new Set(
        existing.map((destination) => destination.code),
      );
      const missingDestinations = DEFAULT_DESTINATIONS.filter(
        (destination) => !existingCodes.has(destination.code),
      );

      if (missingDestinations.length === 0) {
        return;
      }

      await this.prisma.destination.createMany({
        data: missingDestinations,
        skipDuplicates: true,
      });
    } catch {
      // Destination rows are seeded in deploy flows. Read endpoints should not
      // fail if the runtime database role cannot self-heal missing defaults.
    }
  }

  async findAll(userId?: string) {
    await this.ensureDefaultDestinations();
    const uid = userId?.trim();

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
        _count: {
          select: {
            followers: true,
            tips: true,
          },
        },
      },
    });

    const courseCounts = await this.prisma.course.groupBy({
      by: ['country'],
      where: {
        active: true,
        country: {
          in: destinations.map((destination) => destination.code),
        },
      },
      _count: {
        country: true,
      },
    });

    const courseCountByCountry = new Map(
      courseCounts.map((row) => [row.country, row._count.country]),
    );

    let followedDestinationIds = new Set<string>();

    if (uid) {
      const follows = await this.prisma.destinationFollow.findMany({
        where: {
          userId: uid,
          destinationId: {
            in: destinations.map((destination) => destination.id),
          },
        },
        select: {
          destinationId: true,
        },
      });

      followedDestinationIds = new Set(
        follows.map((follow) => follow.destinationId),
      );
    }

    const items = destinations.map((destination) => ({
      id: destination.id,
      code: destination.code,
      name: destination.name,
      slug: destination.slug,
      courseCount: courseCountByCountry.get(destination.code) ?? 0,
      followerCount: destination._count.followers,
      tipsCount: destination._count.tips,
      viewerIsFollowing: followedDestinationIds.has(destination.id),
    }));

    return { items };
  }

  async getDiscoveryTips(takeInput?: unknown) {
    await this.ensureDefaultDestinations();

    const parsedTake =
      typeof takeInput === 'string' ? Number.parseInt(takeInput, 10) : 6;
    const take = Math.max(
      1,
      Math.min(12, Number.isFinite(parsedTake) ? parsedTake : 6),
    );

    const tips = await this.prisma.destinationTip.findMany({
      where: {
        destination: {
          isActive: true,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
      select: {
        id: true,
        text: true,
        createdAt: true,
        destination: {
          select: {
            slug: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            helpfulMarks: true,
          },
        },
      },
    });

    return {
      items: tips.map((tip) => ({
        id: tip.id,
        text: tip.text,
        createdAt: tip.createdAt,
        helpfulCount: tip._count.helpfulMarks,
        destination: tip.destination,
        user: tip.user,
      })),
    };
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

  async getTipsBySlug(slug: string, userId?: string) {
    await this.ensureDefaultDestinations();
    const uid = userId?.trim();

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

    const items = await this.prisma.destinationTip.findMany({
      where: {
        destinationId: destination.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
      select: {
        id: true,
        text: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
        helpfulMarks: uid
          ? {
              where: {
                userId: uid,
              },
              select: {
                id: true,
              },
              take: 1,
            }
          : false,
        _count: {
          select: {
            helpfulMarks: true,
          },
        },
      },
    });

    return {
      destination,
      items: items.map((tip) => ({
        id: tip.id,
        text: tip.text,
        createdAt: tip.createdAt,
        user: tip.user,
        helpfulCount: tip._count.helpfulMarks,
        viewerHasMarkedHelpful: uid ? tip.helpfulMarks.length > 0 : false,
      })),
    };
  }

  async createTip(slug: string, userId: string, text: string) {
    await this.ensureDefaultDestinations();

    const uid = userId?.trim();
    const trimmedText = text?.trim();

    if (!uid) {
      throw new BadRequestException('Missing userId');
    }

    if (!trimmedText) {
      throw new BadRequestException('Missing text');
    }

    if (trimmedText.length > 500) {
      throw new BadRequestException('Tip text must be 500 characters or less');
    }

    const destination = await this.prisma.destination.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    const tip = await this.prisma.destinationTip.create({
      data: {
        destinationId: destination.id,
        userId: uid,
        text: trimmedText,
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        _count: {
          select: {
            helpfulMarks: true,
          },
        },
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

    return {
      id: tip.id,
      text: tip.text,
      createdAt: tip.createdAt,
      user: tip.user,
      helpfulCount: tip._count.helpfulMarks,
      viewerHasMarkedHelpful: false,
    };
  }

  private async findTipForDestination(slug: string, tipId: string) {
    const cleanSlug = slug?.trim();
    const cleanTipId = tipId?.trim();

    if (!cleanSlug) {
      throw new BadRequestException('Missing destination slug');
    }

    if (!cleanTipId) {
      throw new BadRequestException('Missing tipId');
    }

    const tip = await this.prisma.destinationTip.findFirst({
      where: {
        id: cleanTipId,
        destination: {
          slug: cleanSlug,
          isActive: true,
        },
      },
      select: {
        id: true,
      },
    });

    if (!tip) {
      throw new NotFoundException('Destination tip not found');
    }

    return tip;
  }

  private async getTipHelpfulCount(tipId: string) {
    return this.prisma.destinationTipHelpful.count({
      where: {
        tipId,
      },
    });
  }

  async markTipHelpful(slug: string, tipId: string, userId: string) {
    const uid = userId?.trim();

    if (!uid) {
      throw new BadRequestException('Missing userId');
    }

    const tip = await this.findTipForDestination(slug, tipId);

    await this.prisma.destinationTipHelpful.upsert({
      where: {
        tipId_userId: {
          tipId: tip.id,
          userId: uid,
        },
      },
      update: {},
      create: {
        tipId: tip.id,
        userId: uid,
      },
    });

    const helpfulCount = await this.getTipHelpfulCount(tip.id);

    return {
      ok: true,
      helpfulCount,
      viewerHasMarkedHelpful: true,
    };
  }

  async unmarkTipHelpful(slug: string, tipId: string, userId: string) {
    const uid = userId?.trim();

    if (!uid) {
      throw new BadRequestException('Missing userId');
    }

    const tip = await this.findTipForDestination(slug, tipId);

    await this.prisma.destinationTipHelpful.deleteMany({
      where: {
        tipId: tip.id,
        userId: uid,
      },
    });

    const helpfulCount = await this.getTipHelpfulCount(tip.id);

    return {
      ok: true,
      helpfulCount,
      viewerHasMarkedHelpful: false,
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
