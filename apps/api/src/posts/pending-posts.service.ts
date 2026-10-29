import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Visibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { imageMime, ModerationService } from '../moderation/moderation.service';
import { isLegacyAdmin } from '../auth/admin.guard';
import { deleteStoredUpload, uploadToR2 } from '../storage/r2.service';
import { PostsService } from './posts.service';

const DAY = 86400000;
const pendingMessage = 'Your post has been submitted for review and is not visible yet. If approved, it will be published automatically with your chosen audience. We will notify you when a decision is made.';

@Injectable()
export class PendingPostsService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(private readonly prisma: PrismaService, private readonly moderation: ModerationService, private readonly posts: PostsService) {}
  onModuleInit() {
    void this.cleanup().catch(() => undefined);
    this.timer = setInterval(() => { void this.cleanup().catch(() => undefined); }, 60 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  cleanup() {
    return this.prisma.pendingPost.deleteMany({ where: { expiresAt: { lte: new Date() }, OR: [{ state: { not: 'PUBLISHING' } }, { leaseUntil: { lte: new Date() } }] } });
  }

  async submit(userId: string, body: { courseId: string; content: string; visibility?: string }, files: Express.Multer.File[]) {
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const courseId = typeof body?.courseId === 'string' ? body.courseId.trim() : '';
    if (!userId || !courseId || (!content && !files.length)) throw new BadRequestException('Choose a course and add text or an image.');
    if (content.length > 20000 || files.length > 5) throw new BadRequestException('Maximum 20,000 characters and 5 images per post.');
    if (body.visibility !== undefined && !['PUBLIC', 'FOLLOWERS', 'PRIVATE'].includes(body.visibility)) throw new BadRequestException('Invalid post audience');
    const visibility = (body.visibility ?? 'PUBLIC') as Visibility;
    if (!await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })) throw new BadRequestException('Course no longer exists.');
    for (const file of files) {
      if (!file.buffer?.length || file.buffer.length > 5 * 1024 * 1024 || imageMime(file.buffer) !== file.mimetype) throw new BadRequestException('Use JPEG, PNG or WebP images up to 5 MB each.');
    }
    const hash = createHash('sha256').update(JSON.stringify([userId, courseId, content, visibility]));
    for (const file of files) hash.update('\0').update(file.buffer);
    const dedupKey = hash.digest('hex');
    const existing = await this.prisma.pendingPost.findUnique({ where: { dedupKey }, select: { id: true, expiresAt: true } });
    if (existing && existing.expiresAt > new Date()) return { status: 'PENDING_REVIEW', reviewId: existing.id, message: pendingMessage };
    if (existing) await this.prisma.pendingPost.deleteMany({ where: { id: existing.id, expiresAt: { lte: new Date() } } });

    const caseIds: string[] = [];
    const check = async (run: () => Promise<void>) => {
      try { await run(); } catch (error) {
        const response = error instanceof HttpException ? error.getResponse() : null;
        if (response && typeof response === 'object' && 'code' in response && response.code === 'CONTENT_REVIEW_REQUIRED' && 'reviewId' in response && typeof response.reviewId === 'string') caseIds.push(response.reviewId);
        else throw error; // Includes child-safety, rejected content and provider failures: no complete draft is stored.
      }
    };
    await check(() => this.moderation.assertText(userId, 'POST_TEXT', content));
    // Check ALL images before retaining a complete post or uploading anything publicly.
    for (const file of files) await check(() => this.moderation.assertImage(userId, 'POST_IMAGE', file));
    if (!caseIds.length) {
      const urls: string[] = [];
      try {
        for (const file of files) urls.push(await uploadToR2(`posts/${userId}-${randomUUID()}.${this.extension(file.mimetype)}`, file.buffer, file.mimetype));
        return await this.posts.createPost(userId, { courseId, content, visibility }, urls, true);
      } catch (error) { await Promise.allSettled(urls.map(url => deleteStoredUpload(url))); throw error; }
    }
    const admins = (await this.prisma.user.findMany({ where: { OR: [{ adminRole: 'ADMIN' }, { adminRole: null }] }, select: { id: true, handle: true, adminRole: true } }))
      .filter(admin => admin.adminRole === 'ADMIN' || isLegacyAdmin(admin));
    let draft: { id: string };
    try {
      draft = await this.prisma.$transaction(async tx => {
        if (await tx.pendingPost.count({ where: { userId, state: 'PENDING', expiresAt: { gt: new Date() } } }) >= 5) throw new BadRequestException('You already have five posts awaiting review. Please wait for a decision.');
        const cases = await tx.contentModerationCase.findMany({ where: { id: { in: caseIds }, userId, status: 'PENDING', expiresAt: { gt: new Date() } }, select: { categories: true } });
        if (cases.length !== new Set(caseIds).size) throw new ConflictException('Review changed. Please submit again.');
        const created = await tx.pendingPost.create({ data: { userId, courseId, content, visibility, dedupKey, reviewCaseIds: [...new Set(caseIds)], categories: [...new Set(cases.flatMap(c => c.categories))], expiresAt: new Date(Date.now() + 7 * DAY), images: { create: files.map((file, position) => ({ position, mimeType: file.mimetype, bytes: new Uint8Array(file.buffer) })) } }, select: { id: true } });
        await tx.notification.create({ data: { userId, type: 'post_review_pending', title: 'Post submitted for review', body: pendingMessage, link: '/notifications' } });
        if (admins.length) await tx.notification.createMany({ data: admins.map(admin => ({ userId: admin.id, type: 'post_review_requested', title: 'A post needs review', body: 'A new post is waiting for your decision. Open the protected moderation area to review it.', link: `/admin/moderation#${created.id}`, emailPending: true })) });
        return created;
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2002') throw error;
      const duplicate = await this.prisma.pendingPost.findUnique({ where: { dedupKey }, select: { id: true } });
      if (!duplicate) throw error;
      draft = duplicate;
    }
    return { status: 'PENDING_REVIEW', reviewId: draft.id, message: pendingMessage };
  }

  list() {
    return this.prisma.pendingPost.findMany({ where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, content: true, courseId: true, visibility: true, state: true, categories: true, createdAt: true, expiresAt: true, leaseUntil: true, postId: true, user: { select: { name: true, handle: true } }, images: { select: { id: true }, orderBy: { position: 'asc' } } } });
  }
  async preview(id: string, imageId: string) {
    const image = await this.prisma.pendingPostImage.findFirst({ where: { id: imageId, pendingPostId: id, pendingPost: { state: 'PENDING', expiresAt: { gt: new Date() } } }, select: { bytes: true, mimeType: true } });
    if (!image) throw new NotFoundException('Preview unavailable');
    return { bytes: Buffer.from(image.bytes), mimeType: image.mimeType };
  }

  async decide(id: string, reviewerId: string, decision: unknown) {
    if (decision !== 'APPROVED' && decision !== 'REJECTED') throw new BadRequestException('Choose APPROVED or REJECTED');
    const token = randomUUID();
    const claim = await this.prisma.pendingPost.updateMany({ where: { id, expiresAt: { gt: new Date() }, OR: [{ state: 'PENDING' }, { state: 'PUBLISHING', leaseUntil: { lte: new Date() } }] }, data: { state: 'PUBLISHING', publishToken: token, leaseUntil: new Date(Date.now() + 5 * 60000) } });
    if (!claim.count) throw new ConflictException('This post is no longer awaiting a decision. Refresh the list.');
    const urls: string[] = [];
    try {
      const draft = await this.prisma.pendingPost.findUniqueOrThrow({ where: { id }, include: { images: { orderBy: { position: 'asc' } } } });
      if (decision === 'APPROVED') {
        const cases = await this.prisma.contentModerationCase.findMany({ where: { id: { in: draft.reviewCaseIds } }, select: { status: true, categories: true } });
        if (cases.some(c => c.status === 'BLOCKED' || c.categories.includes('sexual/minors'))) throw new BadRequestException('This content has no ordinary approval path.');
        if (!await this.prisma.course.findUnique({ where: { id: draft.courseId }, select: { id: true } })) throw new BadRequestException('The course no longer exists. Reject this post instead.');
        for (const file of draft.images) urls.push(await uploadToR2(`posts/${draft.userId}-${token}-${file.position}.${this.extension(file.mimeType)}`, Buffer.from(file.bytes), file.mimeType));
      }
      return await this.prisma.$transaction(async tx => {
        const completed = await tx.pendingPost.updateMany({ where: { id, state: 'PUBLISHING', publishToken: token }, data: { state: decision as string, dedupKey: null, publishToken: null, leaseUntil: null, reviewerId, decidedAt: new Date(), content: '', expiresAt: new Date(Date.now() + DAY) } });
        if (!completed.count) throw new ConflictException('Another reviewer completed this decision.');
        let postId: string | null = null;
        if (decision === 'APPROVED') {
          const post = await tx.post.create({ data: { userId: draft.userId, courseId: draft.courseId, content: draft.content, visibility: draft.visibility, images: { create: urls.map(url => ({ url })) } }, select: { id: true } });
          postId = post.id;
          await tx.pendingPost.update({ where: { id }, data: { postId } });
        }
        await tx.pendingPostImage.deleteMany({ where: { pendingPostId: id } });
        // Complete the linked legacy signals without granting a blanket approval for future uploads.
        await tx.contentModerationCase.updateMany({ where: { id: { in: draft.reviewCaseIds }, status: 'PENDING' }, data: { status: 'REVIEWED', reviewerId, decidedAt: new Date(), text: null, bytes: null, expiresAt: new Date(Date.now() + DAY) } });
        await tx.notification.create({ data: { userId: draft.userId, type: decision === 'APPROVED' ? 'post_review_approved' : 'post_review_rejected', title: decision === 'APPROVED' ? 'Your post has been published' : 'Your post was not approved', body: decision === 'APPROVED' ? 'Your post was approved and published automatically with your chosen audience. You do not need to submit it again.' : 'Your post was reviewed and was not published. The review copy has been removed. Contact support if you believe this is an error.', link: postId ? `/feed?postId=${encodeURIComponent(postId)}` : '/notifications', emailPending: true } });
        return { ok: true, postId };
      });
    } catch (error) {
      await Promise.allSettled(urls.map(url => deleteStoredUpload(url)));
      await this.prisma.pendingPost.updateMany({ where: { id, state: 'PUBLISHING', publishToken: token }, data: { state: 'PENDING', publishToken: null, leaseUntil: null } });
      throw error;
    }
  }
  private extension(mime: string) { return mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'; }
}
