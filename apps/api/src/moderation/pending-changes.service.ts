import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { UsersController } from '../users/users.controller';
import { PostsService } from '../posts/posts.service';
import { PostsController } from '../posts/posts.controller';
import { TripsService } from '../trips/trips.service';
import { uploadToR2 } from '../storage/r2.service';
import { DestinationsService } from '../destinations/destinations.service';
import { CourseSubmissionsController } from '../course-submissions/course-submissions.controller';
import { CourseSubmissionsService } from '../course-submissions/course-submissions.service';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ModerationScope,
  ModerationService,
  imageMime,
} from './moderation.service';
import { ReviewAction } from './review-action';
import { approvedReview, reviewDigest, reviewStorage } from './review-context';
import { isLegacyAdmin } from '../auth/admin.guard';
import { deleteStoredUpload } from '../storage/r2.service';

const DAY = 86400000;
export function stableJson(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + stableJson(value[key]))
      .join(',') +
    '}'
  );
}
const message =
  'Your content is saved for review and has not been applied. If approved, it will be applied automatically. Your existing content stays unchanged until then. We will notify you in Fairwayd and by email if enabled. You do not need to submit it again.';
type Body = Record<string, any>;
export function reviewRequired(error: unknown): string | null {
  const value = error instanceof HttpException ? error.getResponse() : null;
  return value &&
    typeof value === 'object' &&
    'code' in value &&
    value.code === 'CONTENT_REVIEW_REQUIRED' &&
    'reviewId' in value &&
    typeof value.reviewId === 'string'
    ? value.reviewId
    : null;
}
const profileFields = [
  'handle',
  'name',
  'bio',
  'handicap',
  'homeGolfClub',
  'golfSlogan',
  'favoriteGolfDestination',
  'privacy',
  'bioPrivacy',
  'handicapPrivacy',
  'homeGolfClubPrivacy',
  'golfSloganPrivacy',
  'favoriteGolfDestinationPrivacy',
];
const allowedFields: Record<ReviewAction, string[]> = {
  AVATAR: [],
  TRIP_COVER: [],
  PROFILE: profileFields,
  POST_EDIT: [
    'content',
    'visibility',
    'courseId',
    'retainedImageIds',
    'expectedUpdatedAt',
  ],
  COMMENT_CREATE: ['content', 'parentId'],
  COMMENT_EDIT: ['content'],
  TIP_CREATE: ['text'],
  COURSE_CREATE: [
    'name',
    'description',
    'notes',
    'country',
    'city',
    'region',
    'website',
    'lat',
    'lon',
    'holes',
    'par',
  ],
};

@Injectable()
export class PendingChangesService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}
  onModuleInit() {
    void this.cleanup().catch(() => undefined);
    this.timer = setInterval(() => {
      void this.cleanup().catch(() => undefined);
    }, 3600000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  cleanup() {
    return this.prisma.pendingChange.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }

  async snapshot(
    action: ReviewAction,
    targetId: string,
    userId: string,
    db: any = this.prisma,
  ) {
    let row: any;
    if (action === 'AVATAR')
      row = await db.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });
    if (action === 'PROFILE')
      row = await db.user.findUnique({
        where: { id: userId },
        select: Object.fromEntries(profileFields.map((k) => [k, true])),
      });
    if (action === 'POST_EDIT' || action === 'COMMENT_CREATE')
      row = await db.post.findUnique({
        where: { id: targetId },
        select: { id: true, userId: true, updatedAt: true, visibility: true },
      });
    if (action === 'COMMENT_EDIT')
      row = await db.comment.findUnique({
        where: { id: targetId },
        select: { id: true, userId: true, content: true, postId: true },
      });
    if (action === 'TRIP_COVER')
      row = await db.trip.findUnique({
        where: { id: targetId },
        select: { id: true, coverImageUrl: true },
      });
    if (action === 'TIP_CREATE') row = { slug: targetId };
    if (action === 'COURSE_CREATE') row = {};
    if (!row)
      throw new NotFoundException('The original content no longer exists.');
    return JSON.parse(JSON.stringify(row));
  }
  checks(action: ReviewAction, body: Body, files: Express.Multer.File[]) {
    const texts: Array<{ scope: ModerationScope; text: string }> = [];
    if (action === 'PROFILE')
      texts.push({
        scope: 'PROFILE_TEXT',
        text: [
          String(body.handle ?? '').trim(),
          typeof body.name === 'string' ? body.name.trim() : body.name,
          body.bio,
          body.homeGolfClub,
          body.golfSlogan,
          body.favoriteGolfDestination,
        ]
          .filter((v) => typeof v === 'string')
          .join('\n')
          .trim(),
      });
    if (action === 'POST_EDIT' && typeof body.content === 'string')
      texts.push({ scope: 'POST_TEXT', text: body.content.trim() });
    if (action === 'COMMENT_CREATE' || action === 'COMMENT_EDIT')
      texts.push({
        scope: 'COMMENT_TEXT',
        text: String(body.content ?? '').trim(),
      });
    if (action === 'TIP_CREATE')
      texts.push({
        scope: 'DESTINATION_TEXT',
        text: String(body.text ?? '').trim(),
      });
    if (action === 'COURSE_CREATE')
      texts.push({
        scope: 'PROFILE_TEXT',
        text: [body.name, body.description, body.notes]
          .filter((v) => typeof v === 'string')
          .join('\n')
          .trim(),
      });
    const scope: ModerationScope =
      action === 'AVATAR'
        ? 'AVATAR'
        : action === 'TRIP_COVER'
          ? 'TRIP_COVER'
          : action === 'COURSE_CREATE'
            ? 'COURSE_IMAGE'
            : 'POST_IMAGE';
    return { texts, images: files.map((file) => ({ scope, file })) };
  }
  async capture(
    action: ReviewAction,
    targetId: string,
    userId: string,
    raw: Body,
    files: Express.Multer.File[],
    snapshot: any,
  ) {
    if (!allowedFields[action] || !userId)
      throw new BadRequestException('Invalid content submission');
    if (
      files.length > 5 ||
      files.some(
        (file) =>
          !file.buffer?.length ||
          file.buffer.length > 5 * 1024 * 1024 ||
          imageMime(file.buffer) !== file.mimetype,
      )
    )
      throw new BadRequestException(
        'Use up to five JPEG, PNG or WebP images, up to 5 MB each.',
      );
    if (action === 'COURSE_CREATE' && raw.imageUrl)
      throw new BadRequestException(
        'Please upload an image file rather than an image URL.',
      );
    const payload = Object.fromEntries(
      allowedFields[action]
        .filter((key) => raw[key] !== undefined)
        .map((key) => [key, raw[key]]),
    );
    if (JSON.stringify(payload).length > 60000)
      throw new BadRequestException('Submission is too large');
    // Never overwrite a post that changed between its original edit and this review.
    if (action === 'POST_EDIT')
      payload.expectedUpdatedAt = raw.expectedUpdatedAt ?? snapshot.updatedAt;
    const ids: string[] = [];
    const check = async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (error) {
        const id = reviewRequired(error);
        if (!id) throw error;
        ids.push(id);
      }
    };
    const checks = this.checks(action, payload, files);
    for (const item of checks.texts)
      await check(() =>
        this.moderation.assertText(userId, item.scope, item.text),
      );
    for (const item of checks.images)
      await check(() =>
        this.moderation.assertImage(userId, item.scope, item.file),
      );
    if (!ids.length)
      throw new ConflictException(
        'The review state changed. Please try again.',
      );
    const key = createHash('sha256').update(
      stableJson([userId, action, targetId, payload, snapshot]),
    );
    files.forEach((file) => key.update('\0').update(file.buffer));
    const dedupKey = key.digest('hex');
    const admins = (
      await this.prisma.user.findMany({
        where: { OR: [{ adminRole: 'ADMIN' }, { adminRole: null }] },
        select: { id: true, handle: true, adminRole: true },
      })
    ).filter((a) => a.adminRole === 'ADMIN' || isLegacyAdmin(a));
    let draft: { id: string };
    try {
      draft = await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.pendingChange.findUnique({
            where: { dedupKey },
            select: { id: true, expiresAt: true },
          });
          if (existing && existing.expiresAt > new Date()) return existing;
          if (existing)
            await tx.pendingChange.delete({ where: { id: existing.id } });
          if (
            (await tx.pendingChange.count({
              where: {
                userId,
                state: 'PENDING',
                expiresAt: { gt: new Date() },
              },
            })) >= 5
          )
            throw new BadRequestException(
              'You already have five changes awaiting review.',
            );
          const cases = await tx.contentModerationCase.findMany({
            where: {
              id: { in: [...new Set(ids)] },
              userId,
              status: 'PENDING',
              expiresAt: { gt: new Date() },
            },
            select: { id: true, categories: true },
          });
          if (cases.length !== new Set(ids).size)
            throw new ConflictException(
              'The review state changed. Please try again.',
            );
          const created = await tx.pendingChange.create({
            data: {
              userId,
              action,
              targetId,
              payload,
              snapshot,
              dedupKey,
              reviewCaseIds: cases.map((c) => c.id),
              categories: [...new Set(cases.flatMap((c) => c.categories))],
              expiresAt: new Date(Date.now() + 7 * DAY),
              images: {
                create: files.map((file, position) => ({
                  position,
                  mimeType: file.mimetype,
                  originalName: file.originalname,
                  fieldName: file.fieldname,
                  bytes: new Uint8Array(file.buffer),
                })),
              },
            },
            select: { id: true },
          });
          await tx.notification.create({
            data: {
              userId,
              type: 'content_review_pending',
              title: 'Content submitted for review',
              body: message,
              link: '/notifications',
            },
          });
          if (admins.length)
            await tx.notification.createMany({
              data: admins.map((a) => ({
                userId: a.id,
                type: 'content_review_requested',
                title: 'Content needs review',
                body: 'A content submission is waiting for your decision in the protected moderation area.',
                link: `/admin/moderation#${created.id}`,
                emailPending: true,
              })),
            });
          return created;
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if ((error as any)?.code !== 'P2002') throw error;
      const existing = await this.prisma.pendingChange.findUnique({
        where: { dedupKey },
        select: { id: true },
      });
      if (!existing) throw error;
      draft = existing;
    }
    return { status: 'PENDING_REVIEW', reviewId: draft.id, message };
  }
  list() {
    return this.prisma.pendingChange.findMany({
      where: { expiresAt: { gt: new Date() } },
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        targetId: true,
        payload: true,
        state: true,
        categories: true,
        createdAt: true,
        expiresAt: true,
        user: { select: { name: true, handle: true } },
        images: { orderBy: { position: 'asc' }, select: { id: true } },
      },
    });
  }
  private fingerprints(payload: any, images: Array<{ bytes: Uint8Array }>) {
    // Match the text scopes exactly; hashes never grant future publication rights.
    return images.map((image) =>
      createHash('sha256')
        .update('image\0')
        .update(Buffer.from(image.bytes))
        .digest('hex'),
    );
  }
  async preview(id: string, imageId: string) {
    const image = await this.prisma.pendingChangeImage.findFirst({
      where: {
        id: imageId,
        pendingChangeId: id,
        pendingChange: { state: 'PENDING', expiresAt: { gt: new Date() } },
      },
    });
    if (
      !image ||
      (await this.prisma.contentModerationCase.findFirst({
        where: {
          blockedFingerprint: { in: this.fingerprints({}, [image]) },
          expiresAt: { gt: new Date() },
        },
      }))
    )
      throw new NotFoundException('Preview unavailable');
    return { bytes: Buffer.from(image.bytes), mimeType: image.mimeType };
  }
  async decide(id: string, reviewerId: string, decision: unknown) {
    if (decision !== 'APPROVED' && decision !== 'REJECTED')
      throw new BadRequestException('Choose APPROVED or REJECTED');
    const storage = { uploads: [] as string[], deletions: [] as string[] };
    let result: any;
    try {
      result = await reviewStorage.run(storage, () =>
        this.prisma.$transaction(
          async (tx) => {
            const claimed = await tx.pendingChange.updateMany({
              where: { id, state: 'PENDING', expiresAt: { gt: new Date() } },
              data: { state: decision, reviewerId, decidedAt: new Date() },
            });
            if (!claimed.count)
              throw new ConflictException(
                'This content is no longer awaiting a decision. Refresh the list.',
              );
            const draft = await tx.pendingChange.findUniqueOrThrow({
              where: { id },
              include: { images: { orderBy: { position: 'asc' } } },
            });
            const action = draft.action as ReviewAction;
            if (!allowedFields[action])
              throw new BadRequestException('Unknown content action');
            if (decision === 'APPROVED') {
              const files = draft.images.map(
                (file) =>
                  ({
                    buffer: Buffer.from(file.bytes),
                    mimetype: file.mimeType,
                    originalname: file.originalName,
                    fieldname: file.fieldName,
                    size: file.bytes.length,
                  }) as Express.Multer.File,
              );
              const checks = this.checks(action, draft.payload as Body, files);
              const fingerprints = [
                ...this.fingerprints(draft.payload, draft.images),
                ...checks.texts.map((t) =>
                  createHash('sha256')
                    .update('text\0')
                    .update(t.text)
                    .digest('hex'),
                ),
              ];
              const unsafe = await tx.contentModerationCase.findFirst({
                where: {
                  OR: [
                    {
                      blockedFingerprint: { in: fingerprints },
                      expiresAt: { gt: new Date() },
                    },
                    {
                      id: { in: draft.reviewCaseIds },
                      OR: [
                        { status: 'BLOCKED' },
                        { categories: { has: 'sexual/minors' } },
                      ],
                    },
                  ],
                },
                select: { id: true },
              });
              if (unsafe)
                throw new BadRequestException(
                  'This content has no ordinary approval path.',
                );
              const current = await this.snapshot(
                action,
                draft.targetId,
                draft.userId,
                tx,
              );
              if (stableJson(current) !== stableJson(draft.snapshot))
                throw new ConflictException(
                  'The original content has changed. Reject this outdated submission; it cannot overwrite newer content.',
                );
              const allowed = new Set([
                ...checks.texts.map((t) =>
                  reviewDigest(draft.userId, t.scope, Buffer.from(t.text)),
                ),
                ...checks.images.map((t) =>
                  reviewDigest(draft.userId, t.scope, t.file.buffer),
                ),
              ]);
              await approvedReview.run(allowed, () =>
                this.apply(
                  tx,
                  action,
                  draft.targetId,
                  draft.userId,
                  draft.payload as Body,
                  files,
                ),
              );
            }
            await tx.pendingChangeImage.deleteMany({
              where: { pendingChangeId: id },
            });
            await tx.pendingChange.update({
              where: { id },
              data: {
                payload: {},
                snapshot: {},
                dedupKey: null,
                expiresAt: new Date(Date.now() + DAY),
              },
            });
            // A shared signal cannot approve a different saved action or a future upload.
            await tx.contentModerationCase.updateMany({
              where: { id: { in: draft.reviewCaseIds }, status: 'PENDING' },
              data: {
                status: 'REVIEWED',
                reviewerId,
                decidedAt: new Date(),
                text: null,
                bytes: null,
                expiresAt: new Date(Date.now() + DAY),
              },
            });
            await tx.notification.create({
              data: {
                userId: draft.userId,
                type:
                  decision === 'APPROVED'
                    ? 'content_review_approved'
                    : 'content_review_rejected',
                title:
                  decision === 'APPROVED'
                    ? 'Your content has been applied'
                    : 'Your content was not approved',
                body:
                  decision === 'APPROVED'
                    ? 'Your content was approved and applied automatically. You do not need to submit it again.'
                    : 'Your submission was not applied. Your existing content is unchanged. The private review copy has been removed. Contact support if you believe this is an error.',
                link: '/notifications',
                emailPending: true,
              },
            });
            return { ok: true };
          },
          { isolationLevel: 'Serializable', timeout: 120000 },
        ),
      );
    } catch (error) {
      await Promise.allSettled(
        storage.uploads.map((url) => deleteStoredUpload(url)),
      );
      throw error;
    }
    await Promise.allSettled(
      storage.deletions.map((url) => deleteStoredUpload(url)),
    );
    return result;
  }
  // Reuse business validation/ownership checks with a transaction-scoped service graph.
  // Nothing here accepts an arbitrary route, method, actor, or moderation bypass from a client.
  private async apply(
    tx: any,
    action: ReviewAction,
    targetId: string,
    userId: string,
    body: Body,
    files: Express.Multer.File[],
  ) {
    const notifications = new NotificationsService(tx);
    const req = { user: { id: userId, sub: userId, userId } };
    if (action === 'AVATAR' || action === 'PROFILE') {
      const controller = new UsersController(
        new UsersService(tx, notifications, this.moderation),
        this.moderation,
      );
      return action === 'AVATAR'
        ? controller.uploadMyAvatar(req, files[0])
        : controller.updateProfile(req, body);
    }
    if (
      action === 'POST_EDIT' ||
      action === 'COMMENT_CREATE' ||
      action === 'COMMENT_EDIT'
    ) {
      const controller = new PostsController(
        new PostsService(tx, notifications, this.moderation),
        this.moderation,
      );
      if (action === 'POST_EDIT')
        return controller.updatePost(targetId, req, body, { images: files });
      if (action === 'COMMENT_CREATE')
        return controller.createComment(targetId, req, body as any);
      return controller.updateComment(targetId, req, body as any);
    }
    if (action === 'TRIP_COVER') {
      const trips = new TripsService(tx, notifications);
      await trips.assertCanManageTrip(targetId, userId);

      const file = files[0];
      if (!file) throw new BadRequestException('Missing cover image');
      const url = await uploadToR2(
        `trips/${targetId}/cover-review-${Date.now()}.${file.mimetype.split('/')[1]}`,
        file.buffer,
        file.mimetype,
      );
      // A narrow update preserves the rest of the trip; permissions are rechecked in this transaction.
      return tx.trip.update({
        where: { id: targetId },
        data: { coverImageUrl: url },
      });
    }
    if (action === 'TIP_CREATE') {
      return new DestinationsService(tx, this.moderation).createTip(
        targetId,
        userId,
        body.text,
      );
    }
    if (action === 'COURSE_CREATE') {
      return new CourseSubmissionsController(
        new CourseSubmissionsService(tx),
        this.moderation,
      ).create(body, req, files);
    }
    throw new BadRequestException('Unknown content action');
  }
}
