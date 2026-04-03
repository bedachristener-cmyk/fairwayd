import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountPrivacy, FollowStatus, Prisma } from '@prisma/client';

function normalizeHandle(input: string) {
  return (input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // Me + profile basics
  // =========================================================

  async getMe(userId: string) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
        termsAcceptedAt: true,
        termsVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!me) throw new NotFoundException('User not found');
    return me;
  }

  async acceptTerms(userId: string, termsVersion: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: new Date(),
        termsVersion,
      },
      select: {
        id: true,
        email: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
        termsAcceptedAt: true,
        termsVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(
    userId: string,
    params: { handle: string; name?: string | null },
  ) {
    const safeHandle = normalizeHandle(params.handle);

    if (!safeHandle) {
      throw new ConflictException('Invalid handle');
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
        },
        select: {
          id: true,
          email: true,
          handle: true,
          name: true,
          avatarUrl: true,
          privacy: true,
          termsAcceptedAt: true,
          termsVersion: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Handle already taken');
      }
      throw e;
    }
  }

  async setAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
        termsAcceptedAt: true,
        termsVersion: true,
        createdAt: true,
        updatedAt: true,
      },
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

  async getByHandle(handle: string) {
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
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
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

    return this.prisma.post.findMany({
      where: {
        userId: profileUser.id,
        ...(isSelf ? {} : { visibility: 'PUBLIC' }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        visibility: true,
        course: { select: { id: true, name: true, lat: true, lon: true } },
        user: { select: { id: true, handle: true, avatarUrl: true } },
        images: { select: { id: true, url: true } },
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

    return res.count > 0;
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
