import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateNotificationInput = {
  userId: string;
  actorUserId?: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async emailPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: this.requireUserId(userId) },
      select: { emailTripNotifications: true, emailFollowNotifications: true, emailModerationNotifications: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateEmailPreferences(userId: string, input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Invalid notification settings');
    }
    const allowed = ['emailTripNotifications', 'emailFollowNotifications', 'emailModerationNotifications'];
    const entries = Object.entries(input);
    if (
      !entries.length ||
      entries.some(
        ([key, value]) => !allowed.includes(key) || typeof value !== 'boolean',
      )
    ) {
      throw new BadRequestException(
        'Notification settings must be boolean values',
      );
    }
    return this.prisma.user.update({
      where: { id: this.requireUserId(userId) },
      data: Object.fromEntries(entries),
      select: { emailTripNotifications: true, emailFollowNotifications: true, emailModerationNotifications: true },
    });
  }

  async listForUser(userId: string, take = 50) {
    const uid = this.requireUserId(userId);
    const safeTake = Math.max(1, Math.min(Number(take) || 50, 50));

    const notifications = await this.prisma.notification.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      take: safeTake,
    });
    const followTypes = ['new_follower', 'follow_request', 'follow_request_accepted'];
    const actorIds = [...new Set(notifications.filter(note => followTypes.includes(note.type) && note.actorUserId).map(note => note.actorUserId!))];
    if (!actorIds.length) return notifications;
    const actors = await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, handle: true } });
    const byId = new Map(actors.map(actor => [actor.id, actor]));
    return notifications.map(note => {
      if (!followTypes.includes(note.type) || !note.actorUserId) return note;
      const actor = byId.get(note.actorUserId);
      if (!actor) return note;
      const name = actor.name?.trim() || (actor.handle ? `@${actor.handle}` : null);
      if (!name) return note;
      return { ...note, body: note.type === 'new_follower' ? `${name} started following you.`
        : note.type === 'follow_request_accepted' ? `${name} accepted your follow request.` : `${name} wants to follow you.`,
        link: note.type !== 'follow_request' && actor.handle ? `/u/${encodeURIComponent(actor.handle)}` : note.link };
    });
  }

  async unreadCount(userId: string) {
    const uid = this.requireUserId(userId);

    const count = await this.prisma.notification.count({
      where: {
        userId: uid,
        readAt: null,
      },
    });

    return { count };
  }

  async markRead(userId: string, notificationId: string) {
    const uid = this.requireUserId(userId);
    const id = notificationId?.trim();

    if (!id) {
      throw new BadRequestException('Missing notification id');
    }

    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId: uid,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const uid = this.requireUserId(userId);
    const now = new Date();

    const result = await this.prisma.notification.updateMany({
      where: {
        userId: uid,
        readAt: null,
      },
      data: { readAt: now },
    });

    return { ok: true, updatedCount: result.count };
  }

  async createNotification(input: CreateNotificationInput) {
    const userId = this.requireUserId(input.userId);
    const type = input.type?.trim();
    const title = input.title?.trim();
    const body = input.body?.trim() || null;
    const link = input.link?.trim() || null;

    if (!type) {
      throw new BadRequestException('Notification type is required');
    }

    if (!title) {
      throw new BadRequestException('Notification title is required');
    }

    const emailCategory =
      ['trip_member_added', 'trip_member_removed'].includes(type)
        ? 'emailTripNotifications'
        : [
              'follow_request',
              'follow_request_accepted',
              'new_follower',
            ].includes(type)
          ? 'emailFollowNotifications'
          : null;
    const recipient =
      emailCategory && input.actorUserId !== userId
        ? await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              email: true,
              emailVerifiedAt: true,
              emailTripNotifications: true,
              emailFollowNotifications: true, emailModerationNotifications: true,
            },
          })
        : null;
    const emailPending = Boolean(
      emailCategory &&
      recipient?.email &&
      recipient.emailVerifiedAt &&
      recipient[emailCategory],
    );

    return this.prisma.notification.create({
      data: {
        userId,
        actorUserId: input.actorUserId,
        emailPending,
        type,
        title,
        body,
        link,
      },
    });
  }

  private requireUserId(userId: string | null | undefined) {
    const uid = userId?.trim();

    if (!uid) {
      throw new BadRequestException('Missing userId');
    }

    return uid;
  }
}
