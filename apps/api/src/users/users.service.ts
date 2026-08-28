import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AccountPrivacy,
  FieldPrivacy,
  FollowStatus,
  Prisma,
  Visibility,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

const MIN_HANDLE_LENGTH = 3;
const PROFILE_TEXT_LIMIT = 240;

function normalizeHandle(input: string) {
  return (input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

function isHandleUniqueConflict(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }

  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes('handle') : true;
}

function cleanProfileText(input: string | null | undefined, limit = PROFILE_TEXT_LIMIT) {
  if (typeof input !== 'string') return input ?? undefined;
  const value = input.trim();
  return value ? value.slice(0, limit) : null;
}

function cleanHandicap(input: unknown) {
  if (input === null || input === '' || typeof input === 'undefined') {
    return null;
  }

  const value = Number(input);
  if (!Number.isFinite(value)) {
    throw new BadRequestException('Invalid handicap');
  }

  return Math.max(-10, Math.min(54, value));
}

function cleanFieldPrivacy(input: unknown) {
  if (input === 'PUBLIC' || input === 'FOLLOWERS' || input === 'PRIVATE') {
    return input as FieldPrivacy;
  }

  return undefined;
}

const userProfileSelect = {
  id: true,
  email: true,
  handle: true,
  name: true,
  avatarUrl: true,
  privacy: true,
  bio: true,
  handicap: true,
  homeGolfClub: true,
  golfSlogan: true,
  favoriteGolfDestination: true,
  bioPrivacy: true,
  handicapPrivacy: true,
  homeGolfClubPrivacy: true,
  golfSloganPrivacy: true,
  favoriteGolfDestinationPrivacy: true,
  termsAcceptedAt: true,
  termsVersion: true,
  privacyAcceptedAt: true,
  privacyVersion: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // =========================================================
  // Me + profile basics
  // =========================================================

  async getMe(userId: string) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userProfileSelect,
        password: true,
      },
    });

    if (!me) throw new NotFoundException('User not found');
    const { password, ...safeMe } = me;
    return {
      ...safeMe,
      hasPasswordLogin: !!password,
    };
  }

  async acceptTerms(userId: string, termsVersion: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: new Date(),
        termsVersion,
        privacyAcceptedAt: new Date(),
        privacyVersion: 'v1',
      },
      select: {
        ...userProfileSelect,
        password: true,
      },
    });

    const { password, ...safeUser } = user;
    return {
      ...safeUser,
      hasPasswordLogin: !!password,
    };
  }

  async updateProfile(
    userId: string,
    params: {
      handle: string;
      name?: string | null;
      bio?: string | null;
      handicap?: unknown;
      homeGolfClub?: string | null;
      golfSlogan?: string | null;
      favoriteGolfDestination?: string | null;
      bioPrivacy?: unknown;
      handicapPrivacy?: unknown;
      homeGolfClubPrivacy?: unknown;
      golfSloganPrivacy?: unknown;
      favoriteGolfDestinationPrivacy?: unknown;
    },
  ) {
    const safeHandle = normalizeHandle(params.handle);

    if (!safeHandle || safeHandle.length < MIN_HANDLE_LENGTH) {
      throw new BadRequestException('Handle must be at least 3 characters');
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          handle: safeHandle,
          name:
            typeof params.name === 'string'
              ? params.name.trim()
              : (params.name ?? undefined),
          bio: cleanProfileText(params.bio),
          handicap: cleanHandicap(params.handicap),
          homeGolfClub: cleanProfileText(params.homeGolfClub, 120),
          golfSlogan: cleanProfileText(params.golfSlogan, 140),
          favoriteGolfDestination: cleanProfileText(
            params.favoriteGolfDestination,
            120,
          ),
          bioPrivacy: cleanFieldPrivacy(params.bioPrivacy),
          handicapPrivacy: cleanFieldPrivacy(params.handicapPrivacy),
          homeGolfClubPrivacy: cleanFieldPrivacy(params.homeGolfClubPrivacy),
          golfSloganPrivacy: cleanFieldPrivacy(params.golfSloganPrivacy),
          favoriteGolfDestinationPrivacy: cleanFieldPrivacy(
            params.favoriteGolfDestinationPrivacy,
          ),
        },
        select: userProfileSelect,
      });
    } catch (e) {
      if (isHandleUniqueConflict(e)) {
        throw new ConflictException('Handle is already taken');
      }
      throw e;
    }
  }

  async isHandleAvailable(handle: string, currentUserId?: string | null) {
    const safeHandle = normalizeHandle(handle);

    if (!safeHandle || safeHandle.length < MIN_HANDLE_LENGTH) {
      throw new BadRequestException('Handle must be at least 3 characters');
    }

    const existing = await this.prisma.user.findUnique({
      where: { handle: safeHandle },
      select: { id: true },
    });

    return {
      available: !existing || existing.id === currentUserId,
    };
  }

  async setAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: userProfileSelect,
    });
  }

  // =========================================================
  // User search
  // =========================================================

  async searchUsers(q: string) {
    const query = q.trim();

    if (!query || query.length < 2) {
      return [];
    }

    const items = await this.prisma.user.findMany({
      where: {
        handle: {
          not: null,
        },
        OR: [
          {
            handle: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        handle: true,
        name: true,
        avatarUrl: true,
      },
      orderBy: [{ name: 'asc' }, { handle: 'asc' }],
      take: 20,
    });

    return items;
  }

  // =========================================================
  // Profile + posts by handle
  // =========================================================

  async getByHandle(viewerUserId: string, handle: string) {
    const safeHandle = normalizeHandle(handle);

    if (!safeHandle) throw new NotFoundException('User not found');

    const user = await this.prisma.user.findUnique({
      where: { handle: safeHandle },
      select: {
        id: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
        bio: true,
        handicap: true,
        homeGolfClub: true,
        golfSlogan: true,
        favoriteGolfDestination: true,
        bioPrivacy: true,
        handicapPrivacy: true,
        homeGolfClubPrivacy: true,
        golfSloganPrivacy: true,
        favoriteGolfDestinationPrivacy: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const isSelf = viewerUserId === user.id;
    const isAcceptedFollower = isSelf
      ? false
      : !!(await this.prisma.follow.findFirst({
          where: {
            followerId: viewerUserId,
            followingId: user.id,
            status: FollowStatus.ACCEPTED,
          },
          select: { id: true },
        }));

    const canViewField = (privacy: FieldPrivacy) =>
      isSelf ||
      privacy === FieldPrivacy.PUBLIC ||
      (privacy === FieldPrivacy.FOLLOWERS && isAcceptedFollower);

    return {
      ...user,
      bio: canViewField(user.bioPrivacy) ? user.bio : null,
      handicap: canViewField(user.handicapPrivacy) ? user.handicap : null,
      homeGolfClub: canViewField(user.homeGolfClubPrivacy)
        ? user.homeGolfClub
        : null,
      golfSlogan: canViewField(user.golfSloganPrivacy)
        ? user.golfSlogan
        : null,
      favoriteGolfDestination: canViewField(
        user.favoriteGolfDestinationPrivacy,
      )
        ? user.favoriteGolfDestination
        : null,
    };
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getPostsByHandle(viewerUserId: string, handle: string) {
    const safeHandle = normalizeHandle(handle);

    if (!safeHandle) throw new NotFoundException('User not found');

    const profileUser = await this.prisma.user.findUnique({
      where: { handle: safeHandle },
      select: {
        id: true,
        handle: true,
        name: true,
        avatarUrl: true,
      },
    });

    if (!profileUser) throw new NotFoundException('User not found');

    const isSelf = viewerUserId === profileUser.id;
    const isAcceptedFollower = isSelf
      ? false
      : !!(await this.prisma.follow.findFirst({
          where: {
            followerId: viewerUserId,
            followingId: profileUser.id,
            status: FollowStatus.ACCEPTED,
          },
          select: { id: true },
        }));

    return this.prisma.post.findMany({
      where: {
        userId: profileUser.id,
        ...(isSelf
          ? {}
          : {
              visibility: {
                in: isAcceptedFollower
                  ? [Visibility.PUBLIC, Visibility.FOLLOWERS]
                  : [Visibility.PUBLIC],
              },
            }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        visibility: true,
        course: {
          select: {
            id: true,
            name: true,
            lat: true,
            lon: true,
          },
        },
        user: {
          select: {
            id: true,
            handle: true,
            avatarUrl: true,
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
    });
  }

  async listFollowingUsers(userId: string) {
    const rows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        status: 'ACCEPTED',
      },
      include: {
        following: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows;
  }

  async listFollowingUsersByHandle(handle: string) {
    const safeHandle = normalizeHandle(handle);

    if (!safeHandle) throw new NotFoundException('User not found');

    const user = await this.prisma.user.findUnique({
      where: { handle: safeHandle },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return this.listFollowingUsers(user.id);
  }

  async listFollowedCoursesByHandle(handle: string) {
    const safeHandle = normalizeHandle(handle);

    if (!safeHandle) throw new NotFoundException('User not found');

    const user = await this.prisma.user.findUnique({
      where: { handle: safeHandle },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const rows = await this.prisma.courseFollow.findMany({
      where: { userId: user.id },
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

  async listFollowerUsers(userId: string) {
    const rows = await this.prisma.follow.findMany({
      where: {
        followingId: userId,
        status: 'ACCEPTED',
      },
      include: {
        follower: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows;
  }

  async listFollowerUsersByHandle(handle: string) {
    const safeHandle = normalizeHandle(handle);

    if (!safeHandle) throw new NotFoundException('User not found');

    const user = await this.prisma.user.findUnique({
      where: { handle: safeHandle },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return this.listFollowerUsers(user.id);
  }

  // =========================================================
  // Follow (Instagram-style: PUBLIC => ACCEPTED, PRIVATE => PENDING)
  // =========================================================

  private async mustGetUserPrivacy(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        privacy: true,
        handle: true,
        name: true,
        avatarUrl: true,
      },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async followUser(meId: string, targetUserId: string) {
    if (!meId || !targetUserId)
      throw new BadRequestException('Missing user id');
    if (meId === targetUserId)
      throw new BadRequestException('Cannot follow yourself');

    const target = await this.mustGetUserPrivacy(targetUserId);

    const desiredStatus =
      target.privacy === AccountPrivacy.PUBLIC
        ? FollowStatus.ACCEPTED
        : FollowStatus.PENDING;

    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: meId, followingId: targetUserId },
      },
      select: { status: true },
    });

    const row = await this.prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId: meId, followingId: targetUserId },
      },
      update: {
        status: desiredStatus,
        decidedAt: desiredStatus === FollowStatus.ACCEPTED ? new Date() : null,
      },
      create: {
        followerId: meId,
        followingId: targetUserId,
        status: desiredStatus,
        decidedAt: desiredStatus === FollowStatus.ACCEPTED ? new Date() : null,
      },
      select: { status: true },
    });

    if (!existing && row.status === FollowStatus.PENDING) {
      await this.notifications.createNotification({
        userId: targetUserId,
        type: 'follow_request',
        title: 'New follow request',
        body: 'Someone wants to connect with you.',
        link: '/follow-requests',
      });
    }

    return { status: row.status };
  }

  async unfollowUser(meId: string, targetUserId: string) {
    if (!meId || !targetUserId)
      throw new BadRequestException('Missing user id');
    if (meId === targetUserId)
      throw new BadRequestException('Cannot unfollow yourself');

    await this.prisma.follow.deleteMany({
      where: { followerId: meId, followingId: targetUserId },
    });
  }

  async getFollowStatus(meId: string, targetUserId: string) {
    const row = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: meId, followingId: targetUserId },
      },
      select: { status: true },
    });

    if (!row) return 'NONE';
    if (row.status === FollowStatus.PENDING) return 'PENDING';
    if (row.status === FollowStatus.ACCEPTED) return 'ACCEPTED';
    return 'NONE';
  }

  // =========================================================
  // Follow requests (for the current user)
  // =========================================================

  async listMyFollowRequests(meId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followingId: meId, status: FollowStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
            privacy: true,
            bio: true,
            handicap: true,
            homeGolfClub: true,
            golfSlogan: true,
            favoriteGolfDestination: true,
            bioPrivacy: true,
            handicapPrivacy: true,
            homeGolfClubPrivacy: true,
            golfSloganPrivacy: true,
            favoriteGolfDestinationPrivacy: true,
            createdAt: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      followerId: r.followerId,
      createdAt: r.createdAt,

      followerHandle: r.follower?.handle ?? null,
      followerName: r.follower?.name ?? null,
      followerAvatarUrl: r.follower?.avatarUrl ?? null,
      bio: r.follower?.bioPrivacy === FieldPrivacy.PUBLIC ? r.follower.bio : null,
      handicap:
        r.follower?.handicapPrivacy === FieldPrivacy.PUBLIC
          ? r.follower.handicap
          : null,
      homeGolfClub:
        r.follower?.homeGolfClubPrivacy === FieldPrivacy.PUBLIC
          ? r.follower.homeGolfClub
          : null,
      golfSlogan:
        r.follower?.golfSloganPrivacy === FieldPrivacy.PUBLIC
          ? r.follower.golfSlogan
          : null,
      favoriteGolfDestination:
        r.follower?.favoriteGolfDestinationPrivacy === FieldPrivacy.PUBLIC
          ? r.follower.favoriteGolfDestination
          : null,
    }));
  }

  async listMySentFollowRequests(meId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: meId, status: FollowStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
            privacy: true,
            createdAt: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      followingId: r.followingId,
      createdAt: r.createdAt,

      followingHandle: r.following?.handle ?? null,
      followingName: r.following?.name ?? null,
      followingAvatarUrl: r.following?.avatarUrl ?? null,
    }));
  }

  async acceptFollowRequest(meId: string, followerId: string) {
    const res = await this.prisma.follow.updateMany({
      where: {
        followingId: meId,
        followerId,
        status: FollowStatus.PENDING,
      },
      data: {
        status: FollowStatus.ACCEPTED,
        decidedAt: new Date(),
      },
    });

    const changed = res.count > 0;

    if (changed) {
      await this.notifications.createNotification({
        userId: followerId,
        type: 'follow_request_accepted',
        title: 'Follow request accepted',
        body: 'Your follow request was accepted.',
        link: '/profile',
      });
    }

    return changed;
  }

  async rejectFollowRequest(meId: string, followerId: string) {
    const res = await this.prisma.follow.deleteMany({
      where: {
        followingId: meId,
        followerId,
        status: FollowStatus.PENDING,
      },
    });

    return res.count > 0;
  }
}
