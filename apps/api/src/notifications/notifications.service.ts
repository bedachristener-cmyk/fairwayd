import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, take = 50) {
    const uid = this.requireUserId(userId);
    const safeTake = Math.max(1, Math.min(Number(take) || 50, 50));

    return this.prisma.notification.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      take: safeTake,
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

    return this.prisma.notification.create({
      data: {
        userId,
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
