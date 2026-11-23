import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { sendWebPush } from './web-push-transport';

@Injectable()
export class TripPushDeliveryService {
  private readonly logger = new Logger(TripPushDeliveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async deliverToUser(userId: string, tripId: string, title: string): Promise<void> {
    if (process.env.TRIP_PUSH_DELIVERY_ENABLED !== 'true') return;
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_SUBJECT;
    if (!publicKey || !privateKey || !subject) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushTripNotifications: true },
    });
    if (!user?.pushTripNotifications) return;

    // Recheck current trip membership immediately before delivery. A queued
    // notification must not be sent to someone removed from the trip.
    const currentMembership = await this.prisma.tripMember.findFirst({
      where: { tripId, userId, isGuest: false },
      select: { id: true },
    });
    if (!currentMembership) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (!subscriptions.length) return;

    const payload = JSON.stringify({
      title,
      path: `/trips/${encodeURIComponent(tripId)}`,
      tag: `fairwayd-trip-${tripId}`,
    });
    await Promise.all(subscriptions.map(async subscription => {
      try {
        await sendWebPush({
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        }, payload, { publicKey, privateKey, subject });
      } catch (error) {
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await this.prisma.pushSubscription.deleteMany({
            where: { id: subscription.id, userId },
          });
        } else {
          this.logger.warn(`Trip push delivery failed (status ${status ?? 'unknown'})`);
        }
      }
    }));
  }
}
