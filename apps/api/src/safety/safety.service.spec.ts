import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SafetyService } from './safety.service';

describe('SafetyService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    userBlock: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    follow: { deleteMany: jest.fn() },
    post: { findUnique: jest.fn() },
    comment: { findUnique: jest.fn() },
    contentReport: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  let service: SafetyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SafetyService(prisma as any);
  });

  it('rejects blocking yourself', async () => {
    await expect(service.blockUser('user-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks a user and removes follow connections in both directions', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
    prisma.userBlock.upsert.mockReturnValue({ operation: 'block' });
    prisma.follow.deleteMany.mockReturnValue({ operation: 'unfollow' });
    prisma.$transaction.mockResolvedValue([]);

    await expect(service.blockUser('user-1', 'user-2')).resolves.toEqual({
      ok: true,
    });

    expect(prisma.userBlock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          blockerId_blockedId: {
            blockerId: 'user-1',
            blockedId: 'user-2',
          },
        },
      }),
    );
    expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { followerId: 'user-1', followingId: 'user-2' },
          { followerId: 'user-2', followingId: 'user-1' },
        ],
      },
    });
  });

  it('does not accept a report for a missing referenced post', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(
      service.createReport('user-1', {
        targetType: 'POST',
        targetId: 'missing-post',
        reason: 'SPAM',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.contentReport.create).not.toHaveBeenCalled();
  });
});
