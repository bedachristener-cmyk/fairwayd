import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripPushDeliveryService } from './trip-push-delivery.service';
import { validatePushEndpoint } from './web-push-transport';

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
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly tripPushDelivery?: TripPushDeliveryService,
  ) {}

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

  async pushPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: this.requireUserId(userId) },
      select: { pushTripNotifications: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      ...user,
      available: process.env.TRIP_PUSH_DELIVERY_ENABLED === 'true' &&
        Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY && process.env.WEB_PUSH_SUBJECT),
      publicKey: process.env.WEB_PUSH_PUBLIC_KEY || null,
    };
  }

  async updatePushPreferences(userId: string, input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).length !== 1 ||
      typeof (input as Record<string, unknown>).pushTripNotifications !== 'boolean') {
      throw new BadRequestException('pushTripNotifications must be a boolean');
    }
    return this.prisma.user.update({
      where: { id: this.requireUserId(userId) },
      data: { pushTripNotifications: (input as { pushTripNotifications: boolean }).pushTripNotifications },
      select: { pushTripNotifications: true },
    });
  }

  async subscribePush(userId: string, input: unknown) {
    if (process.env.TRIP_PUSH_DELIVERY_ENABLED !== 'true' ||
      !process.env.WEB_PUSH_PUBLIC_KEY || !process.env.WEB_PUSH_PRIVATE_KEY ||
      !process.env.WEB_PUSH_SUBJECT) {
      throw new BadRequestException('Push notifications are not available');
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Invalid push subscription');
    }
    const value = input as Record<string, unknown>;
    const keys = value.keys;
    if (!keys || typeof keys !== 'object' || Array.isArray(keys)) {
      throw new BadRequestException('Invalid push keys');
    }
    const keyValues = keys as Record<string, unknown>;
    const endpoint = value.endpoint;
    const p256dh = keyValues.p256dh;
    const auth = keyValues.auth;
    if (typeof endpoint !== 'string' || endpoint.length > 2048 ||
      !validatePushEndpoint(endpoint) ||
      typeof p256dh !== 'string' || !/^[A-Za-z0-9_-]{60,150}={0,2}$/.test(p256dh) ||
      typeof auth !== 'string' || !/^[A-Za-z0-9_-]{12,50}={0,2}$/.test(auth)) {
      throw new BadRequestException('Invalid push subscription fields');
    }
    const uid = this.requireUserId(userId);
    // Never allow one account to silently take over another user's endpoint.
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { userId: true },
    });
    if (existing && existing.userId !== uid) {
      throw new BadRequestException('This device is already registered to another account');
    }
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh, auth, userId: uid },
      update: { p256dh, auth },
    });
    return { ok: true };
  }

  async unsubscribePush(userId: string, input: unknown) {
    const endpoint = input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>).endpoint : null;
    if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 2048) {
      throw new BadRequestException('Invalid push endpoint');
    }
    await this.prisma.pushSubscription.deleteMany({
      where: { userId: this.requireUserId(userId), endpoint },
    });
    return { ok: true };
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

    const created = await this.prisma.notification.create({
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

    // Push delivery is an optional side effect; it must never block or fail
    // the original notification or the trip mutation.
    if (this.tripPushDelivery &&
      (type.startsWith('trip_item_') || type.startsWith('trip_document_')) &&
      link?.startsWith('/trips/')) {
      const tripId = link.slice('/trips/'.length).split('/')[0];
      if (tripId) {
        try {
          await this.tripPushDelivery.deliverToUser(userId, tripId, title, body, link);
        } catch {
          // Delivery failure must not prevent the in-app notification.
        }
      }
    }
    return created;
  }

  private requireUserId(userId: string | null | undefined) {
    const uid = userId?.trim();

    if (!uid) {
      throw new BadRequestException('Missing userId');
    }

    return uid;
  }
}
