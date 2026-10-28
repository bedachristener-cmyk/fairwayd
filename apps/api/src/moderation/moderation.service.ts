import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type ModerationScope = 'POST_TEXT' | 'COMMENT_TEXT' | 'PROFILE_TEXT' | 'POST_IMAGE' | 'AVATAR' | 'TRIP_COVER' | 'COURSE_IMAGE' | 'DESTINATION_TEXT';
const TTL = 7 * 24 * 60 * 60 * 1000;
export const moderationEnabled = () => process.env.CONTENT_MODERATION_ENABLED === 'true';
export function imageMime(bytes: Buffer): string {
  if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  throw new BadRequestException('Please upload a JPEG, PNG or WebP image.');
}

@Injectable()
export class ModerationService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private readonly rates = new Map<string, { count: number; until: number }>();
  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    if (moderationEnabled() && !process.env.OPENAI_MODERATION_API_KEY?.trim()) throw new Error('Moderation is enabled but its API key is missing');
    if (moderationEnabled()) {
      void this.cleanup().catch(() => undefined);
      this.timer = setInterval(() => { void this.cleanup().catch(() => undefined); }, 60 * 60 * 1000);
      this.timer.unref();
    }
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  cleanup() { return this.prisma.contentModerationCase.deleteMany({ where: { expiresAt: { lte: new Date() } } }); }

  async assertText(userId: string, scope: ModerationScope, value: string) {
    if (!moderationEnabled() || !value?.trim()) return;
    const text = value.trim();
    if (text.length > 20000) throw new BadRequestException('Text is too long (maximum 20,000 characters).');
    await this.safelyAssess(userId, scope, Buffer.from(text), [{ type: 'text', text }], { text });
  }
  async assertImage(userId: string, scope: ModerationScope, file: { buffer: Buffer; mimetype?: string }) {
    if (!moderationEnabled()) return;
    if (!file.buffer?.length || file.buffer.length > 5 * 1024 * 1024) throw new BadRequestException('Images must be between 1 byte and 5 MB.');
    const mimeType = imageMime(file.buffer);
    if (file.mimetype !== mimeType) throw new BadRequestException('Image format does not match its declared file type.');
    await this.safelyAssess(userId, scope, file.buffer, [{ type: 'image_url', image_url: { url: `data:${mimeType};base64,${file.buffer.toString('base64')}` } }], { bytes: file.buffer, mimeType });
  }
  private async safelyAssess(...args: Parameters<ModerationService['assess']>) {
    try { return await this.assess(...args); } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Content checks are temporarily unavailable. Nothing has been published; please try again later.');
    }
  }
  private pending(id: string) {
    return new UnprocessableEntityException({ code: 'CONTENT_REVIEW_REQUIRED', reviewId: id, message: `This content was not published and needs an admin review. Reference: ${id}. If approved, submit the unchanged content again.` });
  }
  private async assess(userId: string, scope: ModerationScope, bytes: Buffer, input: unknown[], retained: { text?: string; bytes?: Buffer; mimeType?: string }) {
    if (!userId) throw new BadRequestException('Missing user id');
    if (this.rates.size > 10000) for (const [id, rate] of this.rates) if (rate.until < Date.now()) this.rates.delete(id);
    const rate = this.rates.get(userId);
    if (rate && rate.until > Date.now() && rate.count >= 30) throw new ServiceUnavailableException('Too many content checks. Please try again in a minute.');
    this.rates.set(userId, rate && rate.until > Date.now() ? { ...rate, count: rate.count + 1 } : { count: 1, until: Date.now() + 60000 });
    const fingerprint = createHash('sha256').update(retained.bytes ? 'image\0' : 'text\0').update(bytes).digest('hex');
    if (await this.prisma.contentModerationCase.findFirst({ where: { blockedFingerprint: fingerprint }, select: { id: true } })) throw new UnprocessableEntityException('This content cannot be published. Contact support if you believe this is an error.');
    const digest = createHash('sha256').update(scope).update('\0').update(bytes).digest('hex');
    const existing = await this.prisma.contentModerationCase.findUnique({ where: { userId_scope_digest: { userId, scope, digest } }, select: { id: true, status: true, expiresAt: true } });
    if (existing && existing.expiresAt > new Date()) {
      if (existing.status === 'APPROVED') return;
      if (existing.status === 'PENDING') throw this.pending(existing.id);
      throw new UnprocessableEntityException({ code: 'CONTENT_REJECTED', message: 'This content cannot be published. Please change it or contact support.' });
    }
    if (existing) await this.prisma.contentModerationCase.deleteMany({ where: { id: existing.id, expiresAt: { lte: new Date() } } });
    const key = process.env.OPENAI_MODERATION_API_KEY?.trim();
    if (!key) throw new ServiceUnavailableException('Content checks are temporarily unavailable. Nothing has been published; please try again later.');
    let result: { flagged: boolean; categories: Record<string, boolean> };
    try {
      const response = await fetch('https://api.openai.com/v1/moderations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'omni-moderation-latest', input }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Moderation unavailable');
      const data = await response.json() as any;
      if (!Array.isArray(data.results) || data.results.length !== 1 || typeof data.results[0]?.flagged !== 'boolean' || !data.results[0]?.categories || typeof data.results[0].categories !== 'object' || ['sexual', 'sexual/minors', 'violence'].some(k => typeof data.results[0].categories[k] !== 'boolean') || Object.values(data.results[0].categories).some(v => typeof v !== 'boolean')) throw new Error('Invalid moderation response');
      result = data.results[0];
    } catch {
      // Never expose provider errors, credentials, text, or image bytes in logs.
      throw new ServiceUnavailableException('Content checks are temporarily unavailable. Nothing has been published; please try again later.');
    }
    if (!result.flagged && !Object.values(result.categories).some(Boolean)) return;
    const categories = Object.entries(result.categories).filter(([, value]) => value).map(([category]) => category);
    // Never retain or provide an override for material identified as sexual/minors.
    const blocked = categories.includes('sexual/minors');
    const review = await this.prisma.$transaction(async tx => {
    if (await tx.contentModerationCase.count({ where: { userId, status: 'PENDING', expiresAt: { gt: new Date() } } }) >= 5) throw new UnprocessableEntityException('You already have five pending reviews. Please wait for an admin decision.');
    return tx.contentModerationCase.upsert({
      where: { userId_scope_digest: { userId, scope, digest } }, update: {},
      create: { userId, scope, digest, categories, blockedFingerprint: blocked ? fingerprint : null, status: blocked ? 'BLOCKED' : 'PENDING', text: blocked ? null : retained.text, bytes: blocked || !retained.bytes ? null : new Uint8Array(retained.bytes), mimeType: blocked ? null : retained.mimeType, expiresAt: new Date(Date.now() + TTL) },
    });
    }, { isolationLevel: 'Serializable' });
    if (blocked) throw new UnprocessableEntityException({ code: 'CONTENT_REJECTED', message: 'This content cannot be published. Contact support if you believe this is an error.' });
    throw this.pending(review.id);
  }
  async list() {
    return this.prisma.contentModerationCase.findMany({ where: { expiresAt: { gt: new Date() } }, take: 100, orderBy: { createdAt: 'desc' }, select: { id: true, userId: true, scope: true, status: true, categories: true, text: true, mimeType: true, createdAt: true, expiresAt: true, decidedAt: true } });
  }
  async preview(id: string) {
    const row = await this.prisma.contentModerationCase.findFirst({ where: { id, status: 'PENDING', expiresAt: { gt: new Date() } } });
    if (!row?.bytes || !row.mimeType) throw new NotFoundException('Preview not available');
    return { bytes: Buffer.from(row.bytes), mimeType: row.mimeType };
  }
  async decide(id: string, reviewerId: string, decision: unknown) {
    if (decision !== 'APPROVED' && decision !== 'REJECTED') throw new BadRequestException('Choose APPROVED or REJECTED');
    const row = await this.prisma.contentModerationCase.findUnique({ where: { id }, select: { userId: true } });
    if (!row) throw new NotFoundException('Review not found');
    await this.prisma.$transaction(async tx => {
      const result = await tx.contentModerationCase.updateMany({ where: { id, status: 'PENDING', expiresAt: { gt: new Date() } }, data: { status: decision, reviewerId, decidedAt: new Date(), bytes: null, text: null, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
      if (!result.count) throw new ConflictException('This review is no longer pending. Refresh the list.');
      await tx.notification.create({ data: { userId: row.userId, actorUserId: reviewerId, type: 'content_moderation_decided', title: 'Content review complete', body: decision === 'APPROVED' ? `Your content (${id}) was approved. Submit the unchanged content again within 24 hours to publish it.` : `Your content (${id}) was not approved and has not been published. Contact support if you believe this is an error.`, emailPending: false } });
    });
    return { ok: true };
  }
}

export async function requireTextCheck(service: ModerationService | undefined, userId: string, scope: ModerationScope, text: string) {
  if (!service && moderationEnabled()) throw new ServiceUnavailableException('Content checks are unavailable');
  await service?.assertText(userId, scope, text);
}
export async function requireImageCheck(service: ModerationService | undefined, userId: string, scope: ModerationScope, file: Express.Multer.File) {
  if (!service && moderationEnabled()) throw new ServiceUnavailableException('Content checks are unavailable');
  await service?.assertImage(userId, scope, file);
}
