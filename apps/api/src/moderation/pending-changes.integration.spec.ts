import { randomUUID, createHash } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationService } from './moderation.service';
import { PendingChangesService } from './pending-changes.service';
import { ReviewAction } from './review-action';
import { uploadToR2 } from '../storage/r2.service';
jest.mock('../storage/r2.service', () => ({
  uploadToR2: jest.fn(async (key: string) => `https://test.invalid/${key}`),
  deleteStoredUpload: jest.fn(),
}));
const integration =
  process.env.PENDING_POST_TEST_DATABASE === '1' &&
  process.env.NEON_DATABASE_URL?.includes('127.0.0.1:5432/pending_posts_test')
    ? describe
    : describe.skip;
integration('Complete content changes against isolated PostgreSQL', () => {
  let db: PrismaService,
    moderation: ModerationService,
    changes: PendingChangesService;
  const author = `review-author-${randomUUID()}`,
    admin = `review-admin-${randomUUID()}`,
    course = `review-course-${randomUUID()}`;
  const destination = `review-destination-${randomUUID()}`;
  const originalFetch = global.fetch;
  let postId: string, tripId: string, commentId: string;
  const image = (suffix = '') =>
    ({
      buffer: Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
        Buffer.from(suffix),
      ]),
      mimetype: 'image/png',
      originalname: 'golf.png',
      fieldname: 'images',
    }) as Express.Multer.File;
  beforeAll(async () => {
    db = new PrismaService();
    await db.$connect();
    await db.user.createMany({
      data: [
        {
          id: author,
          handle: `ci_${randomUUID().slice(0, 12).replace(/-/g, '')}`,
          avatarUrl: 'https://test.invalid/old.png',
        },
        { id: admin, adminRole: 'ADMIN' },
      ],
    });
    await db.course.create({
      data: {
        id: course,
        name: 'Review CI course',
        country: 'CH',
        lat: 47,
        lon: 8,
      },
    });
    await db.destination.create({ data: { id: destination, code: 'ZZ', name: 'Isolated review destination', slug: destination, isActive: true } });
    moderation = new ModerationService(db);
    changes = new PendingChangesService(db, moderation);
    process.env.CONTENT_MODERATION_ENABLED = 'true';
    process.env.OPENAI_MODERATION_API_KEY = 'test-only';
  });
  beforeEach(async () => {
    await db.pendingChange.deleteMany({ where: { userId: author } });
    await db.contentModerationCase.deleteMany({ where: { userId: author } });
    // Reset moderation rate counters between isolated test cases.
    moderation = new ModerationService(db);
    changes = new PendingChangesService(db, moderation);
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              flagged: true,
              categories: {
                sexual: true,
                'sexual/minors': false,
                violence: false,
              },
            },
          ],
        }),
      });
    const post = await db.post.create({
      data: {
        userId: author,
        courseId: course,
        content: 'Original post',
        visibility: 'PRIVATE',
        images: { create: [{ url: 'https://test.invalid/original-post.png' }] },
      },
    });
    postId = post.id;
    commentId = (
      await db.comment.create({
        data: { userId: author, postId, content: 'Original comment' },
      })
    ).id;
    tripId = (
      await db.trip.create({
        data: {
          title: 'Review CI trip',
          createdById: author,
          members: { create: { userId: author, role: 'OWNER' } },
        },
      })
    ).id;
    (uploadToR2 as jest.Mock).mockClear();
  });
  afterAll(async () => {
    global.fetch = originalFetch;
    delete process.env.CONTENT_MODERATION_ENABLED;
    delete process.env.OPENAI_MODERATION_API_KEY;
    if (db) {
      await db.user.deleteMany({ where: { id: { in: [author, admin] } } });
      await db.course.delete({ where: { id: course } });
      await db.destination.delete({ where: { id: destination } });
      await db.$disconnect();
    }
  });
  async function queue(
    action: ReviewAction,
    target: string,
    body: any,
    files: Express.Multer.File[] = [],
  ) {
    return changes.capture(
      action,
      target,
      author,
      body,
      files,
      await changes.snapshot(action, target, author),
    );
  }
  it.each([
    'AVATAR',
    'PROFILE',
    'POST_EDIT',
    'COMMENT_CREATE',
    'COMMENT_EDIT',
    'TRIP_COVER',
    'TIP_CREATE',
    'COURSE_CREATE',
  ] as ReviewAction[])(
    'applies %s directly, once, without another submission',
    async (action) => {
      const user = await db.user.findUniqueOrThrow({ where: { id: author } });
      const dest = await db.destination.findFirstOrThrow({
        where: { id: destination },
      });
      const target =
        action === 'POST_EDIT' || action === 'COMMENT_CREATE'
          ? postId
          : action === 'COMMENT_EDIT'
            ? commentId
            : action === 'TRIP_COVER'
              ? tripId
              : action === 'TIP_CREATE'
                ? dest.slug
                : author;
      const body =
        action === 'PROFILE'
          ? { handle: user.handle, bio: 'Reviewed profile' }
          : action === 'POST_EDIT'
            ? { content: 'Reviewed post', visibility: 'PRIVATE' }
            : action === 'COMMENT_CREATE' || action === 'COMMENT_EDIT'
              ? { content: `Reviewed ${action}` }
              : action === 'TIP_CREATE'
                ? { text: 'Reviewed travel tip' }
                : action === 'COURSE_CREATE'
                  ? { name: 'Reviewed CI suggestion', country: 'CH' }
                  : {};
      const files = [
        'AVATAR',
        'TRIP_COVER',
        'COURSE_CREATE',
        'POST_EDIT',
      ].includes(action)
        ? [image()]
        : [];
      const pending = await queue(action, target, body, files);
      expect(pending.status).toBe('PENDING_REVIEW');
      expect(uploadToR2).not.toHaveBeenCalled();
      if (action === 'POST_EDIT')
        expect(
          (await db.post.findUniqueOrThrow({ where: { id: postId } })).content,
        ).toBe('Original post');
      const attempts = await Promise.allSettled([
        changes.decide(pending.reviewId, admin, 'APPROVED'),
        changes.decide(pending.reviewId, admin, 'APPROVED'),
      ]);
      expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
      const row = await db.pendingChange.findUniqueOrThrow({
        where: { id: pending.reviewId },
      });
      expect(row).toMatchObject({
        state: 'APPROVED',
        payload: {},
        snapshot: {},
        dedupKey: null,
      });
      expect(
        await db.pendingChangeImage.count({
          where: { pendingChangeId: row.id },
        }),
      ).toBe(0);
      expect(
        await db.notification.count({
          where: {
            userId: author,
            type: 'content_review_approved',
            body: { contains: 'again' },
          },
        }),
      ).toBeGreaterThan(0);
      if (action === 'AVATAR')
        expect(
          (await db.user.findUniqueOrThrow({ where: { id: author } }))
            .avatarUrl,
        ).not.toBe(user.avatarUrl);
      if (action === 'PROFILE')
        expect(
          (await db.user.findUniqueOrThrow({ where: { id: author } })).bio,
        ).toBe('Reviewed profile');
      if (action === 'POST_EDIT') {
        const post = await db.post.findUniqueOrThrow({
          where: { id: postId },
          include: { images: true },
        });
        expect(post.content).toBe('Reviewed post');
        expect(post.visibility).toBe('PRIVATE');
        expect(post.images).toHaveLength(2);
      }
      if (action === 'COMMENT_CREATE')
        expect(
          await db.comment.count({ where: { postId, content: body.content } }),
        ).toBe(1);
      if (action === 'COMMENT_EDIT')
        expect(
          (await db.comment.findUniqueOrThrow({ where: { id: commentId } }))
            .content,
        ).toBe(body.content);
      if (action === 'TRIP_COVER')
        expect(
          (await db.trip.findUniqueOrThrow({ where: { id: tripId } }))
            .coverImageUrl,
        ).toContain('cover-review');
      if (action === 'TIP_CREATE')
        expect(
          await db.destinationTip.count({
            where: { userId: author, text: body.text },
          }),
        ).toBe(1);
      if (action === 'COURSE_CREATE')
        expect(
          await db.courseSubmission.count({
            where: { submittedByUserId: author, name: body.name },
          }),
        ).toBe(1);
    },
  );
  it('rejects a picture without replacing the current avatar and purges the private copy', async () => {
    const before = await db.user.findUniqueOrThrow({ where: { id: author } });
    const pending = await queue('AVATAR', author, {}, [image()]);
    await changes.decide(pending.reviewId, admin, 'REJECTED');
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: author } })).avatarUrl,
    ).toBe(before.avatarUrl);
    expect(uploadToR2).not.toHaveBeenCalled();
    expect(
      await db.pendingChangeImage.count({
        where: { pendingChangeId: pending.reviewId },
      }),
    ).toBe(0);
  });
  it('does not overwrite a newer avatar or post; rejection stays possible', async () => {
    const pending = await queue('AVATAR', author, {}, [image()]);
    await db.user.update({
      where: { id: author },
      data: { avatarUrl: 'https://test.invalid/newer.png' },
    });
    await expect(
      changes.decide(pending.reviewId, admin, 'APPROVED'),
    ).rejects.toThrow(ConflictException);
    expect(uploadToR2).not.toHaveBeenCalled();
    expect(
      (
        await db.pendingChange.findUniqueOrThrow({
          where: { id: pending.reviewId },
        })
      ).state,
    ).toBe('PENDING');
    await changes.decide(pending.reviewId, admin, 'REJECTED');
  });
  it('rechecks trip membership before approval', async () => {
    const pending = await queue('TRIP_COVER', tripId, {}, [image()]);
    await db.tripMember.deleteMany({ where: { tripId, userId: author } });
    await expect(
      changes.decide(pending.reviewId, admin, 'APPROVED'),
    ).rejects.toThrow();
    expect(uploadToR2).not.toHaveBeenCalled();
    expect(
      (await db.trip.findUniqueOrThrow({ where: { id: tripId } }))
        .coverImageUrl,
    ).toBeNull();
  });
  it('rechecks global child-safety fingerprints before any upload', async () => {
    const file = image();
    const pending = await queue('AVATAR', author, {}, [file]);
    await db.contentModerationCase.create({
      data: {
        userId: admin,
        scope: 'POST_IMAGE',
        digest: randomUUID(),
        status: 'BLOCKED',
        categories: ['sexual/minors'],
        blockedFingerprint: createHash('sha256')
          .update('image\0')
          .update(file.buffer)
          .digest('hex'),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await expect(
      changes.preview(
        pending.reviewId,
        (
          await db.pendingChangeImage.findFirstOrThrow({
            where: { pendingChangeId: pending.reviewId },
          })
        ).id,
      ),
    ).rejects.toThrow();
    await expect(
      changes.decide(pending.reviewId, admin, 'APPROVED'),
    ).rejects.toThrow(BadRequestException);
    expect(uploadToR2).not.toHaveBeenCalled();
  });
  it('checks every image and never queues a complete submission containing a later child-safety signal', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              flagged: true,
              categories: {
                sexual: true,
                'sexual/minors': false,
                violence: false,
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              flagged: true,
              categories: {
                sexual: true,
                'sexual/minors': true,
                violence: false,
              },
            },
          ],
        }),
      });
    await expect(
      queue('COURSE_CREATE', author, { name: '' }, [
        image('ordinary'),
        image('blocked'),
      ]),
    ).rejects.toThrow();
    expect(await db.pendingChange.count({ where: { userId: author } })).toBe(0);
    expect(uploadToR2).not.toHaveBeenCalled();
  });
  it('expires pending submissions without publication', async () => {
    const pending = await queue('AVATAR', author, {}, [image('expiry')]);
    await db.pendingChange.update({
      where: { id: pending.reviewId },
      data: { expiresAt: new Date(0) },
    });
    await expect(
      changes.decide(pending.reviewId, admin, 'APPROVED'),
    ).rejects.toThrow();
    await changes.cleanup();
    expect(
      await db.pendingChange.findUnique({ where: { id: pending.reviewId } }),
    ).toBeNull();
    expect(
      await db.pendingChangeImage.count({
        where: { pendingChangeId: pending.reviewId },
      }),
    ).toBe(0);
  });
});
