import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReportTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeReportInput } from './safety-policy';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async listBlockedUsers(userId: string) {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        blocked: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      items: rows.map((row) => ({
        ...row.blocked,
        blockedAt: row.createdAt,
      })),
    };
  }

  async blockUser(userId: string, blockedId: string) {
    const targetId = blockedId?.trim();
    if (!targetId) throw new BadRequestException('Missing user id');
    if (targetId === userId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.userBlock.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: userId,
            blockedId: targetId,
          },
        },
        update: {},
        create: { blockerId: userId, blockedId: targetId },
      }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId, followingId: targetId },
            { followerId: targetId, followingId: userId },
          ],
        },
      }),
    ]);

    return { ok: true };
  }

  async unblockUser(userId: string, blockedId: string) {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId: userId, blockedId: blockedId?.trim() },
    });
    return { ok: true };
  }

  async createReport(
    reporterId: string,
    input: {
      targetType?: unknown;
      targetId?: unknown;
      targetUrl?: unknown;
      reason?: unknown;
      details?: unknown;
    },
  ) {
    const report = normalizeReportInput(input);

    if (report.targetId) {
      let exists = true;
      if (report.targetType === ReportTargetType.POST) {
        exists = !!(await this.prisma.post.findUnique({
          where: { id: report.targetId },
          select: { id: true },
        }));
      } else if (report.targetType === ReportTargetType.COMMENT) {
        exists = !!(await this.prisma.comment.findUnique({
          where: { id: report.targetId },
          select: { id: true },
        }));
      } else if (report.targetType === ReportTargetType.PROFILE) {
        exists = !!(await this.prisma.user.findUnique({
          where: { id: report.targetId },
          select: { id: true },
        }));
      }
      if (!exists) throw new NotFoundException('Reported content not found');
    }

    const created = await this.prisma.contentReport.create({
      data: { reporterId, ...report },
      select: { id: true, status: true, createdAt: true },
    });

    return { ok: true, report: created };
  }
}
