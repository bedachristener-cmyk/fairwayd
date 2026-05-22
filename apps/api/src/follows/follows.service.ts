import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FollowStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async countPendingRequests(userId: string) {
    return this.prisma.follow.count({
      where: { followingId: userId, status: FollowStatus.PENDING },
    });
  }

  async listPendingRequests(userId: string) {
    return this.prisma.follow.findMany({
      where: { followingId: userId, status: FollowStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        follower: {
          select: { id: true, handle: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  async requestFollow(followerId: string, followingId: string) {
    if (!followerId || !followingId) {
      throw new BadRequestException('Missing user ids');
    }
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // create if missing, otherwise return existing (unique constraint)
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { id: true, status: true },
    });

    if (existing) return existing;

    const row = await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
        status: FollowStatus.PENDING,
      },
      select: { id: true, status: true },
    });

    if (row.status === FollowStatus.PENDING) {
      await this.notifications.createNotification({
        userId: followingId,
        type: 'follow_request',
        title: 'New follow request',
        body: 'Someone wants to connect with you.',
        link: '/follow-requests',
      });
    }

    return row;
  }

  async unfollow(followerId: string, followingId: string) {
    return this.prisma.follow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });
  }

  async acceptRequest(myUserId: string, followId: string) {
    const row = await this.prisma.follow.findUnique({
      where: { id: followId },
      select: { id: true, followerId: true, followingId: true, status: true },
    });

    if (!row) throw new NotFoundException('Request not found');
    if (row.followingId !== myUserId)
      throw new ForbiddenException('Not allowed');
    if (row.status !== FollowStatus.PENDING) return row;

    const updated = await this.prisma.follow.update({
      where: { id: followId },
      data: { status: FollowStatus.ACCEPTED, decidedAt: new Date() },
      select: { id: true, status: true },
    });

    await this.notifications.createNotification({
      userId: row.followerId,
      type: 'follow_request_accepted',
      title: 'Follow request accepted',
      body: 'Your follow request was accepted.',
      link: '/profile',
    });

    return updated;
  }

  async declineRequest(myUserId: string, followId: string) {
    const row = await this.prisma.follow.findUnique({
      where: { id: followId },
      select: { id: true, followingId: true },
    });

    if (!row) throw new NotFoundException('Request not found');
    if (row.followingId !== myUserId)
      throw new ForbiddenException('Not allowed');

    await this.prisma.follow.delete({ where: { id: followId } });
    return { ok: true };
  }
}
