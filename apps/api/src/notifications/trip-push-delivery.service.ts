import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Optional at runtime until explicitly enabled. The dependency is installed
// as part of the push feature release, not loaded in the disabled path.
type WebPushClient = {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number },
  ): Promise<unknown>;
};

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

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (!subscriptions.length) return;

    // Use a lazy require so a disabled rollout cannot affect normal API startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webPush = require('web-push') as WebPushClient;
    webPush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title,
      path: `/trips/${encodeURIComponent(tripId)}`,
      tag: `fairwayd-trip-${tripId}`,
    });
    await Promise.all(subscriptions.map(async subscription => {
      try {
        await webPush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, payload, { TTL: 300 });
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
