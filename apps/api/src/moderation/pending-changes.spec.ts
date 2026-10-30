import { Controller, Post, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UnprocessableEntityException } from '@nestjs/common';
import request from 'supertest';
import { of } from 'rxjs';
import { PendingChangesService, stableJson } from './pending-changes.service';
import { Reviewable } from './review-action';
import { ReviewActionInterceptor } from './review-action.interceptor';
import { approvedReview, reviewDigest } from './review-context';
import { ModerationService } from './moderation.service';
@Controller('example')
class ExampleController {
  @Post('avatar')
  @Reviewable('AVATAR')
  avatar(@Req() req: any) {
    req.file = { buffer: Buffer.from('private') };
    throw new UnprocessableEntityException({
      code: 'CONTENT_REVIEW_REQUIRED',
      reviewId: 'signal',
    });
  }
}
describe('Unified review boundary', () => {
  it('compares snapshots independently of PostgreSQL JSONB key order', () =>
    expect(stableJson({ b: 2, a: { y: 1, x: 2 } })).toBe(
      stableJson({ a: { x: 2, y: 1 }, b: 2 }),
    ));
  it('returns 202 and captures the request without treating it as a saved avatar', async () => {
    const changes = {
      snapshot: jest.fn().mockResolvedValue({ avatarUrl: 'old' }),
      capture: jest
        .fn()
        .mockResolvedValue({ status: 'PENDING_REVIEW', reviewId: 'draft' }),
    };
    const module = await Test.createTestingModule({
      controllers: [ExampleController],
      providers: [
        { provide: PendingChangesService, useValue: changes },
        { provide: APP_INTERCEPTOR, useClass: ReviewActionInterceptor },
      ],
    }).compile();
    const app = module.createNestApplication();
    app.use((req: any, _res: any, next: any) => {
      req.user = { id: 'owner' };
      next();
    });
    await app.init();
    try {
      await request(app.getHttpServer())
        .post('/example/avatar')
        .send({ userId: 'forged' })
        .expect(202)
        .expect('Cache-Control', 'private, no-store');
      expect(changes.capture).toHaveBeenCalledWith(
        'AVATAR',
        'owner',
        'owner',
        { userId: 'forged' },
        expect.any(Array),
        { avatarUrl: 'old' },
      );
    } finally {
      await app.close();
    }
  });
  it('a scoped approval never authorises a different user, scope or content', async () => {
    process.env.CONTENT_MODERATION_ENABLED = 'true';
    const prisma = {
      contentModerationCase: {
        findFirst: jest.fn().mockResolvedValue({ id: 'blocked' }),
      },
    };
    const moderation = new ModerationService(prisma as any);
    try {
      await approvedReview.run(
        new Set([reviewDigest('owner', 'POST_TEXT', Buffer.from('exact'))]),
        async () => {
          await expect(
            moderation.assertText('owner', 'POST_TEXT', 'exact'),
          ).resolves.toBeUndefined();
          await expect(
            moderation.assertText('other', 'POST_TEXT', 'exact'),
          ).rejects.toThrow();
          await expect(
            moderation.assertText('owner', 'COMMENT_TEXT', 'exact'),
          ).rejects.toThrow();
          await expect(
            moderation.assertText('owner', 'POST_TEXT', 'changed'),
          ).rejects.toThrow();
        },
      );
    } finally {
      delete process.env.CONTENT_MODERATION_ENABLED;
    }
  });
});
