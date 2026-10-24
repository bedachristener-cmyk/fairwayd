import { BadRequestException } from '@nestjs/common';
import { Visibility } from '@prisma/client';
import {
  normalizePostCollectionName,
  visiblePostWhere,
} from './post-collection-policy';

describe('post collection policy', () => {
  it('normalizes a readable private collection name', () => {
    expect(normalizePostCollectionName('  Golfurlaub   Thailand  ')).toBe(
      'Golfurlaub Thailand',
    );
  });

  it('rejects empty and excessively long names', () => {
    expect(() => normalizePostCollectionName('   ')).toThrow(
      BadRequestException,
    );
    expect(() => normalizePostCollectionName('x'.repeat(61))).toThrow(
      BadRequestException,
    );
  });

  it('allows own, public, and accepted-follower posts only', () => {
    const where = visiblePostWhere('viewer-1');
    expect(where.AND?.[1]).toEqual({ OR: [
      { userId: 'viewer-1' },
      { visibility: Visibility.PUBLIC },
      {
        visibility: Visibility.FOLLOWERS,
        user: {
          followers: {
            some: {
              followerId: 'viewer-1',
              status: 'ACCEPTED',
            },
          },
        },
      },
    ] });
    expect(where.AND?.[0]).toEqual({
      NOT: {
        OR: [
          { user: { blockedBy: { some: { blockerId: 'viewer-1' } } } },
          { user: { blockedUsers: { some: { blockedId: 'viewer-1' } } } },
        ],
      },
    });
  });
});
