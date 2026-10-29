import { BadRequestException, ConflictException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PendingPostsService } from './pending-posts.service';
import { PendingPostsController } from './pending-posts.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from '../auth/admin.guard';
import { deleteStoredUpload, uploadToR2 } from '../storage/r2.service';
jest.mock('../storage/r2.service', () => ({ uploadToR2: jest.fn(), deleteStoredUpload: jest.fn() }));
const file = (name = 'one.png') => ({ originalname: name, mimetype: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10,0]) }) as Express.Multer.File;
const flagged = () => new UnprocessableEntityException({ code: 'CONTENT_REVIEW_REQUIRED', reviewId: 'signal' });
function setup() {
  const draft = { id: 'draft', userId: 'author', courseId: 'course', content: 'A round of golf', visibility: 'PRIVATE', reviewCaseIds: ['signal'], images: [{ ...file(), bytes: file().buffer, position: 0 }] };
  const prisma = {
    course: { findUnique: jest.fn().mockResolvedValue({ id: 'course' }) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'admin', adminRole: 'ADMIN' }, { id: 'former', adminRole: 'USER' }]) },
    pendingPost: { findUnique: jest.fn().mockResolvedValue(null), findUniqueOrThrow: jest.fn().mockResolvedValue(draft), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ id: 'draft' }), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), deleteMany: jest.fn() },
    contentModerationCase: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([{ status: 'PENDING', categories: ['sexual'] }]), updateMany: jest.fn() },
    pendingPostImage: { findFirst: jest.fn(), deleteMany: jest.fn() },
    notification: { create: jest.fn(), createMany: jest.fn() },
    post: { create: jest.fn().mockResolvedValue({ id: 'published' }) },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async fn => fn(prisma));
  const moderation = { assertText: jest.fn().mockResolvedValue(undefined), assertImage: jest.fn().mockRejectedValue(flagged()) };
  const posts = { createPost: jest.fn().mockResolvedValue({ id: 'clean-post' }) };
  return { prisma, moderation, posts, draft, service: new PendingPostsService(prisma as any, moderation as any, posts as any) };
}
beforeEach(() => { jest.clearAllMocks(); (uploadToR2 as jest.Mock).mockResolvedValue('https://storage.test/post.png'); (deleteStoredUpload as jest.Mock).mockResolvedValue(undefined); });
describe('Complete pending posts', () => {
  it('retains the whole post privately after checking every image and queues one admin alert', async () => {
    const { service, prisma, moderation } = setup();
    const result = await service.submit('author', { courseId: 'course', content: 'Full text', visibility: 'PRIVATE' }, [file(), file('two.png')]);
    expect(result).toMatchObject({ status: 'PENDING_REVIEW', reviewId: 'draft' });
    expect(moderation.assertImage).toHaveBeenCalledTimes(2);
    expect(prisma.pendingPost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: 'Full text', visibility: 'PRIVATE', images: { create: [expect.objectContaining({ position: 0, bytes: expect.any(Uint8Array) }), expect.objectContaining({ position: 1 })] } }) }));
    expect(uploadToR2).not.toHaveBeenCalled(); expect(prisma.post.create).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ userId: 'admin', emailPending: true, link: '/admin/moderation#draft' })] });
  });
  it('does not create another draft or alert for an unchanged pending submission', async () => {
    const { service, prisma, moderation } = setup();
    prisma.pendingPost.findUnique.mockResolvedValue({ id: 'waiting', expiresAt: new Date(Date.now() + 60000) });
    expect(await service.submit('author', { courseId: 'course', content: 'Text' }, [file()])).toMatchObject({ reviewId: 'waiting' });
    expect(moderation.assertText).not.toHaveBeenCalled(); expect(prisma.pendingPost.create).not.toHaveBeenCalled();
  });
  it('does not retain the complete post or publish if a later image has a child-safety signal', async () => {
    const { service, prisma, moderation } = setup();
    moderation.assertImage.mockRejectedValueOnce(flagged()).mockRejectedValueOnce(new UnprocessableEntityException({ code: 'CONTENT_REJECTED' }));
    await expect(service.submit('author', { courseId: 'course', content: 'Text' }, [file(), file('two.png')])).rejects.toThrow();
    expect(prisma.pendingPost.create).not.toHaveBeenCalled(); expect(uploadToR2).not.toHaveBeenCalled();
  });
  it('fails closed on provider errors and validates files/course before any moderation', async () => {
    const a = setup(); a.moderation.assertImage.mockRejectedValue(new ServiceUnavailableException());
    await expect(a.service.submit('author', { courseId: 'course', content: '' }, [file()])).rejects.toThrow(ServiceUnavailableException);
    expect(a.prisma.pendingPost.create).not.toHaveBeenCalled();
    const b = setup();
    await expect(b.service.submit('author', { courseId: 'course', content: '' }, [{ ...file(), mimetype: 'image/jpeg' }])).rejects.toThrow(BadRequestException);
    expect(b.moderation.assertText).not.toHaveBeenCalled();
    b.prisma.course.findUnique.mockResolvedValue(null);
    await expect(b.service.submit('author', { courseId: 'missing', content: 'Text' }, [])).rejects.toThrow();
  });
  it('publishes clean posts immediately and cleans uploads on a database failure', async () => {
    const { service, moderation, posts } = setup(); moderation.assertImage.mockResolvedValue(undefined);
    expect(await service.submit('author', { courseId: 'course', content: '' }, [file()])).toEqual({ id: 'clean-post' });
    posts.createPost.mockRejectedValue(new Error('database'));
    await expect(service.submit('author', { courseId: 'course', content: '' }, [file()])).rejects.toThrow();
    expect(deleteStoredUpload).toHaveBeenCalledWith('https://storage.test/post.png');
  });
  it('publishes the exact stored post once, preserves its audience and atomically notifies the author', async () => {
    const { service, prisma } = setup();
    expect(await service.decide('draft', 'admin', 'APPROVED')).toEqual({ ok: true, postId: 'published' });
    expect(prisma.post.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'author', content: 'A round of golf', courseId: 'course', visibility: 'PRIVATE' }) }));
    expect(prisma.pendingPostImage.deleteMany).toHaveBeenCalledWith({ where: { pendingPostId: 'draft' } });
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'author', type: 'post_review_approved', emailPending: true, link: '/feed?postId=published' }) });
    expect(prisma.contentModerationCase.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REVIEWED', bytes: null, text: null }) }));
    prisma.pendingPost.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.decide('draft', 'admin2', 'APPROVED')).rejects.toThrow(ConflictException);
    expect(prisma.post.create).toHaveBeenCalledTimes(1);
  });
  it('rejects without a public upload, removes review payloads and queues an explanatory decision', async () => {
    const { service, prisma } = setup();
    expect(await service.decide('draft', 'admin', 'REJECTED')).toEqual({ ok: true, postId: null });
    expect(prisma.post.create).not.toHaveBeenCalled(); expect(uploadToR2).not.toHaveBeenCalled();
    expect(prisma.pendingPostImage.deleteMany).toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'post_review_rejected', emailPending: true }) });
  });
  it('cleans a failed publication and restores only its own decision lease for retry', async () => {
    const { service, prisma } = setup(); prisma.post.create.mockRejectedValue(new Error('write failed'));
    await expect(service.decide('draft', 'admin', 'APPROVED')).rejects.toThrow('write failed');
    expect(deleteStoredUpload).toHaveBeenCalledWith('https://storage.test/post.png');
    expect(prisma.pendingPost.updateMany).toHaveBeenLastCalledWith({ where: { id: 'draft', state: 'PUBLISHING', publishToken: expect.any(String) }, data: { state: 'PENDING', publishToken: null, leaseUntil: null } });
  });
  it('blocks publication when another account has since raised a child-safety fingerprint', async () => {
    const { service, prisma } = setup();
    prisma.contentModerationCase.findFirst.mockResolvedValue({ id: 'later-child-safety-signal' });
    await expect(service.decide('draft', 'admin', 'APPROVED')).rejects.toThrow(BadRequestException);
    expect(uploadToR2).not.toHaveBeenCalled(); expect(prisma.post.create).not.toHaveBeenCalled();
    prisma.pendingPostImage.findFirst.mockResolvedValue({ bytes: file().buffer, mimeType: 'image/png' });
    await expect(service.preview('draft', 'image')).rejects.toThrow('Preview unavailable');
    expect(prisma.contentModerationCase.findFirst).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: expect.objectContaining({ blockedFingerprint: { in: expect.arrayContaining([expect.any(String)]) } }) }));
  });
  it('refuses child-safety overrides, missing courses and forged decisions', async () => {
    const { service, prisma } = setup();
    await expect(service.decide('draft', 'admin', 'PUBLISHED')).rejects.toThrow(BadRequestException);
    prisma.contentModerationCase.findMany.mockResolvedValue([{ status: 'BLOCKED', categories: ['sexual/minors'] }]);
    await expect(service.decide('draft', 'admin', 'APPROVED')).rejects.toThrow(BadRequestException);
    expect(uploadToR2).not.toHaveBeenCalled(); expect(prisma.post.create).not.toHaveBeenCalled();
  });
});

describe('Pending-post admin HTTP boundary', () => {
  let app: any;
  const service = { submit: jest.fn().mockResolvedValue({ status: 'PENDING_REVIEW', reviewId: 'draft' }), list: jest.fn().mockResolvedValue([]), preview: jest.fn().mockResolvedValue({ bytes: file().buffer, mimeType: 'image/png' }), decide: jest.fn().mockResolvedValue({ ok: true }) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [PendingPostsController, PostsController], providers: [{ provide: PostsService, useValue: {} }, AdminGuard, { provide: PrismaService, useValue: { user: { findUnique: async ({ where }: any) => ({ id: where.id, adminRole: where.id === 'admin' ? 'ADMIN' : 'USER' }) } } }, { provide: PendingPostsService, useValue: service }] })
      .overrideGuard(AuthGuard('jwt')).useValue({ canActivate: (context: any) => { const req = context.switchToHttp().getRequest(); if (!req.headers['x-test-user']) return false; req.user = { id: req.headers['x-test-user'] }; return true; } }).compile();
    app = module.createNestApplication(); await app.init();
  });
  afterAll(async () => app.close());
  it.each(['', 'member'])('denies private posts, image bytes and decisions to %s', async user => {
    const headers = user ? { 'x-test-user': user } : {};
    await request(app.getHttpServer()).get('/safety/admin/pending-posts').set(headers).expect(403);
    await request(app.getHttpServer()).get('/safety/admin/pending-posts/d/images/i').set(headers).expect(403);
    await request(app.getHttpServer()).patch('/safety/admin/pending-posts/d').set(headers).send({ decision: 'APPROVED' }).expect(403);
    expect(service.preview).not.toHaveBeenCalled(); expect(service.decide).not.toHaveBeenCalled();
  });
  it('returns a pending response rather than a fake post and takes author identity from JWT', async () => {
    await request(app.getHttpServer()).post('/posts').set('x-test-user', 'member').send({ courseId: 'course', content: 'Text', userId: 'forged' }).expect(202).expect({ status: 'PENDING_REVIEW', reviewId: 'draft' });
    expect(service.submit).toHaveBeenCalledWith('member', expect.objectContaining({ courseId: 'course', content: 'Text' }), []);
  });
  it('protects previews from caching and uses the authenticated reviewer identity', async () => {
    const r = await request(app.getHttpServer()).get('/safety/admin/pending-posts/d/images/i').set('x-test-user', 'admin').expect(200);
    expect(r.headers['cache-control']).toBe('private, no-store');
    await request(app.getHttpServer()).patch('/safety/admin/pending-posts/d').set('x-test-user', 'admin').send({ decision: 'APPROVED', reviewerId: 'forged' }).expect(200);
    expect(service.decide).toHaveBeenCalledWith('d', 'admin', 'APPROVED');
  });
});
