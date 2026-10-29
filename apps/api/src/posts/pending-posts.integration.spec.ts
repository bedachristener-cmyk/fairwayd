import { randomUUID } from 'crypto';
import { UnprocessableEntityException } from '@nestjs/common';
import { PendingPostsService } from './pending-posts.service';
import { PrismaService } from '../prisma/prisma.service';
jest.mock('../storage/r2.service', () => ({ uploadToR2: jest.fn(async (key: string) => `https://test.invalid/${key}`), deleteStoredUpload: jest.fn() }));
const integration = process.env.PENDING_POST_TEST_DATABASE === '1' && process.env.NEON_DATABASE_URL?.includes('127.0.0.1:5432/pending_posts_test') ? describe : describe.skip;
integration('Pending-post migration and publication with PostgreSQL', () => {
  let db: PrismaService;
  let service: PendingPostsService;
  const author = `test-author-${randomUUID()}`;
  const admin = `test-admin-${randomUUID()}`;
  const course = `test-course-${randomUUID()}`;
  let signal = '';
  beforeAll(async () => {
    db = new PrismaService(); await db.$connect();
    await db.user.createMany({ data: [{ id: author }, { id: admin, adminRole: 'ADMIN' }] });
    await db.course.create({ data: { id: course, name: 'Isolated CI course', country: 'CH', lat: 47, lon: 8 } });
    const moderation = { assertText: async () => undefined, assertImage: async () => { throw new UnprocessableEntityException({ code: 'CONTENT_REVIEW_REQUIRED', reviewId: signal }); } };
    service = new PendingPostsService(db, moderation as any, {} as any);
  });
  beforeEach(async () => {
    signal = `test-signal-${randomUUID()}`;
    await db.contentModerationCase.create({ data: { id: signal, userId: author, scope: 'POST_IMAGE', digest: randomUUID(), categories: ['violence'], expiresAt: new Date(Date.now() + 86400000) } });
  });
  afterAll(async () => {
    if (!db) return;
    // All records are created by this test in an explicitly isolated local CI database.
    await db.user.deleteMany({ where: { id: { in: [author, admin] } } });
    await db.course.deleteMany({ where: { id: course } });
    await db.$disconnect();
  });
  const image = () => ({ originalname: 'golf.png', mimetype: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10,0]) }) as Express.Multer.File;
  it('keeps database status validation and the image size guard enforced', async () => {
    await expect(db.$executeRaw`UPDATE "ContentModerationCase" SET "status" = 'INVALID_STATUS' WHERE "id" = ${signal}`).rejects.toThrow();
    const checks = await db.$queryRaw<{ conname: string; definition: string }[]>`SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = '"ContentModerationCase"'::regclass AND contype = 'c'`;
    expect(checks.find(c => c.conname === 'ContentModerationCase_status_check')?.definition).toContain('REVIEWED');
    expect(checks.find(c => c.conname === 'ContentModerationCase_bytes_limit')?.definition).toContain('5242880');
  });
  it('retains a complete private post, publishes once under concurrent approvals and preserves all fields', async () => {
    const result = await service.submit(author, { courseId: course, content: 'Private golf test', visibility: 'PRIVATE' }, [image(), image()]);
    const id = (result as { reviewId: string }).reviewId;
    expect(await db.post.count({ where: { userId: author } })).toBe(0);
    expect(await db.pendingPostImage.count({ where: { pendingPostId: id } })).toBe(2);
    const repeat = await service.submit(author, { courseId: course, content: 'Private golf test', visibility: 'PRIVATE' }, [image(), image()]);
    expect(repeat).toMatchObject({ reviewId: id });
    const attempts = await Promise.allSettled([service.decide(id, admin, 'APPROVED'), service.decide(id, admin, 'APPROVED')]);
    expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const post = await db.post.findFirstOrThrow({ where: { userId: author }, include: { images: true } });
    expect(post).toMatchObject({ content: 'Private golf test', visibility: 'PRIVATE', courseId: course });
    expect(post.images).toHaveLength(2);
    expect(await db.post.count({ where: { userId: author } })).toBe(1);
    expect(await db.pendingPostImage.count({ where: { pendingPostId: id } })).toBe(0);
    expect(await db.notification.count({ where: { userId: author, type: 'post_review_approved', emailPending: true } })).toBe(1);
    expect(await db.contentModerationCase.findUnique({ where: { id: signal } })).toMatchObject({ status: 'REVIEWED', text: null, bytes: null });
  });
  it('rejects atomically without a post and clears all retained images and text', async () => {
    const result = await service.submit(author, { courseId: course, content: 'Reject this test', visibility: 'FOLLOWERS' }, [image()]);
    const id = (result as { reviewId: string }).reviewId;
    const before = await db.post.count({ where: { userId: author } });
    await service.decide(id, admin, 'REJECTED');
    expect(await db.post.count({ where: { userId: author } })).toBe(before);
    expect(await db.pendingPost.findUnique({ where: { id } })).toMatchObject({ state: 'REJECTED', content: '', dedupKey: null });
    expect(await db.pendingPostImage.count({ where: { pendingPostId: id } })).toBe(0);
    expect(await db.notification.count({ where: { userId: author, type: 'post_review_rejected', emailPending: true } })).toBe(1);
    expect(await db.contentModerationCase.findUnique({ where: { id: signal } })).toMatchObject({ status: 'REVIEWED', text: null, bytes: null });
  });
});
