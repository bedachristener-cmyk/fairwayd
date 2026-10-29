import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SafetyService } from './safety.service';

describe('SafetyService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userBlock: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    follow: { deleteMany: jest.fn() },
    post: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    contentReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
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

  it('lists open reports with their referenced target', async () => {
    prisma.contentReport.findMany.mockResolvedValue([
      {
        id: 'report-1',
        targetType: 'POST',
        targetId: 'post-1',
        targetUrl: null,
        reason: 'SPAM',
        details: null,
        status: 'OPEN',
        createdAt: new Date('2026-10-24T10:00:00Z'),
        reviewedAt: null,
        reporter: { id: 'user-1', handle: 'golfer', name: 'Golfer' },
      },
    ]);
    prisma.post.findMany.mockResolvedValue([
      {
        id: 'post-1',
        content: 'Reported content',
        createdAt: new Date('2026-10-24T09:00:00Z'),
        user: { id: 'user-2', handle: 'author', name: 'Author' },
        course: { id: 'course-1', name: 'Test Course' },
      },
    ]);
    prisma.comment.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);

    const result = await service.listReports('OPEN');

    expect(prisma.contentReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'OPEN' } }),
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'report-1',
        targetExists: true,
        target: expect.objectContaining({ id: 'post-1' }),
      }),
    );
  });

  it('marks a report as dismissed', async () => {
    prisma.contentReport.findUnique.mockResolvedValue({ id: 'report-1' });
    prisma.contentReport.update.mockResolvedValue({
      id: 'report-1',
      status: 'DISMISSED',
      reviewedAt: new Date(),
    });

    await expect(
      service.updateReportStatus('report-1', 'DISMISSED'),
    ).resolves.toEqual({
      ok: true,
      report: expect.objectContaining({ status: 'DISMISSED' }),
    });
  });

  it('removes a reported comment and resolves its report', async () => {
    prisma.contentReport.findUnique.mockResolvedValue({
      id: 'report-1',
      targetType: 'COMMENT',
      targetId: 'comment-1',
    });
    prisma.comment.findUnique.mockResolvedValue({ id: 'comment-1' });
    prisma.comment.delete.mockReturnValue({ operation: 'delete-comment' });
    prisma.contentReport.update.mockReturnValue({ operation: 'resolve-report' });
    prisma.$transaction.mockResolvedValue([]);

    await expect(service.removeReportedTarget('report-1')).resolves.toEqual({
      ok: true,
      removedType: 'COMMENT',
      removedId: 'comment-1',
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      { operation: 'delete-comment' },
      { operation: 'resolve-report' },
    ]);
  });
});
