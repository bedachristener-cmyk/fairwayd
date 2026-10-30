import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../auth/mail.service';
import { isLegacyAdmin } from '../auth/admin.guard';
import { notificationWebUrl } from './activity-email';

const followTypes = [
  'follow_request',
  'follow_request_accepted',
  'new_follower',
];

@Injectable()
export class NotificationEmailService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(NotificationEmailService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.deliverPending();
    }, 30_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async deliverPending() {
    if (
      this.running ||
      !process.env.RESEND_API_KEY?.trim() ||
      process.env.NOTIFICATION_EMAILS_ENABLED === 'false'
    )
      return;
    this.running = true;
    try {
      const baseUrl = notificationWebUrl();
      const now = new Date();
      const rows = await this.prisma.notification.findMany({
        where: {
          emailPending: true,
          emailNextAttemptAt: { lte: now },
          emailAttempts: { lt: 5 },
        },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      for (const row of rows) {
        // Atomic lease prevents two API instances from sending the same row.
        const claim = await this.prisma.notification.updateMany({
          where: {
            id: row.id,
            emailPending: true,
            emailNextAttemptAt: { lte: now },
            emailAttempts: { lt: 5 },
          },
          data: {
            emailAttempts: { increment: 1 },
            emailNextAttemptAt: new Date(Date.now() + 5 * 60_000),
          },
        });
        if (!claim.count) continue;
        try {
          const recipient = await this.prisma.user.findUnique({
            where: { id: row.userId },
            select: {
              email: true,
              emailVerifiedAt: true,
              name: true,
              handle: true,
              emailTripNotifications: true,
              emailFollowNotifications: true,
              emailModerationNotifications: true, adminRole: true, id: true,
            },
          });
          const moderationType = ['post_review_requested', 'post_review_approved', 'post_review_rejected', 'content_moderation_decided', 'content_review_requested', 'content_review_approved', 'content_review_rejected'].includes(row.type);
          const enabled = moderationType ? recipient?.emailModerationNotifications :
            ['trip_member_added', 'trip_member_removed'].includes(row.type)
              ? recipient?.emailTripNotifications
              : followTypes.includes(row.type)
                ? recipient?.emailFollowNotifications
                : false;
          if (
            !recipient?.email ||
            !recipient.emailVerifiedAt ||
            !enabled ||
            (!moderationType && row.actorUserId === row.userId)
          ) {
            await this.prisma.notification.update({
              where: { id: row.id },
              data: { emailPending: false },
            });
            continue;
          }
          const actor = row.actorUserId
            ? await this.prisma.user.findUnique({
                where: { id: row.actorUserId },
                select: { name: true, handle: true },
              })
            : null;
          const actorName =
            actor?.name || (actor?.handle ? `@${actor.handle}` : 'A golfer');
          let body = row.body || row.title;
          let link = row.link || '/notifications';
          if (row.type === 'trip_member_added') {
            const tripId = row.link?.match(/^\/trips\/([^/?#]+)$/)?.[1];
            const trip = tripId
              ? await this.prisma.trip.findUnique({
                  where: { id: decodeURIComponent(tripId) },
                  select: {
                    title: true,
                    members: {
                      where: { userId: row.userId },
                      select: { id: true },
                    },
                  },
                })
              : null;
            // Do not send stale invitations after removal or trip deletion.
            if (!trip?.members.length) {
              await this.prisma.notification.update({
                where: { id: row.id },
                data: { emailPending: false },
              });
              continue;
            }
            body = `${actorName} added you to “${trip.title}”. Open the trip to see your itinerary and travel plans.`;
          } else if (row.type === 'trip_member_removed') {
            link = '/trips';
          } else if (moderationType) {
            if (row.type === 'post_review_requested' || row.type === 'content_review_requested') {
              const draftId = row.link?.match(/^\/admin\/moderation#([^/?#]+)$/)?.[1];
              const query = { where: { id: draftId ?? '', state: 'PENDING', expiresAt: { gt: new Date() } }, select: { id: true as const } };
              const draft = !draftId ? null : row.type === 'content_review_requested' ? await this.prisma.pendingChange.findFirst(query) : await this.prisma.pendingPost.findFirst(query);
              if (!recipient || !(recipient.adminRole === 'ADMIN' || (recipient.adminRole === null && isLegacyAdmin(recipient))) || !draft) {
                await this.prisma.notification.update({ where: { id: row.id }, data: { emailPending: false } });
                continue;
              }
            }
            // No submitted text, image or classification is included in email.
          } else {
            // A withdrawn request or removed connection should not trigger a delayed mail.
            const incoming = row.type !== 'follow_request_accepted';
            const connection = row.actorUserId
              ? await this.prisma.follow.findUnique({
                  where: {
                    followerId_followingId: {
                      followerId: incoming ? row.actorUserId : row.userId,
                      followingId: incoming ? row.userId : row.actorUserId,
                    },
                  },
                  select: { status: true },
                })
              : null;
            const expectedStatus =
              row.type === 'follow_request' ? 'PENDING' : 'ACCEPTED';
            if (!connection || connection.status !== expectedStatus) {
              await this.prisma.notification.update({
                where: { id: row.id },
                data: { emailPending: false },
              });
              continue;
            }
            body =
              row.type === 'follow_request'
                ? `${actorName} would like to follow you. Review their request in Fairwayd.`
                : row.type === 'follow_request_accepted'
                  ? `${actorName} accepted your follow request.`
                  : `${actorName} is now following you.`;
            if (row.type !== 'follow_request' && actor?.handle)
              link = `/u/${encodeURIComponent(actor.handle)}`;
          }
          await this.mail.sendActivityNotification({
            email: recipient.email,
            name: recipient.name || recipient.handle || 'golfer',
            title: row.title,
            body,
            link,
            baseUrl,
            notificationId: row.id,
            showAction: row.type !== 'trip_member_removed',
          });
          await this.prisma.notification.update({
            where: { id: row.id },
            data: { emailPending: false, emailSentAt: new Date() },
          });
        } catch {
          // Retain the durable lease for retry; no recipient data or tokens in logs.
          this.logger.warn(
            `Notification email attempt failed (${row.id}, attempt ${row.emailAttempts + 1}/5)`,
          );
        }
      }
    } catch (error) {
      const kind = error instanceof Error ? error.name : 'UnknownError';
      const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code.replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) : 'none';
      this.logger.warn(
        `Notification email queue could not be processed (${kind}, code=${code}); check mail and frontend configuration.`,
      );
    } finally {
      this.running = false;
    }
  }
}
