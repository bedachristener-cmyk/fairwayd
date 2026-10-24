import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ReportStatus,
  ReportTargetType,
} from '@prisma/client';
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

  async listReports(status?: string) {
    const requested = String(status ?? 'OPEN').trim().toUpperCase();
    const allowed = new Set(Object.values(ReportStatus));
    if (requested !== 'ALL' && !allowed.has(requested as ReportStatus)) {
      throw new BadRequestException('Invalid report status');
    }

    const reports = await this.prisma.contentReport.findMany({
      where: requested === 'ALL' ? undefined : { status: requested as ReportStatus },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        targetUrl: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        reporter: {
          select: {
            id: true,
            handle: true,
            name: true,
          },
        },
      },
    });

    const postIds = reports
      .filter((item) => item.targetType === ReportTargetType.POST && item.targetId)
      .map((item) => item.targetId as string);
    const commentIds = reports
      .filter((item) => item.targetType === ReportTargetType.COMMENT && item.targetId)
      .map((item) => item.targetId as string);
    const profileIds = reports
      .filter((item) => item.targetType === ReportTargetType.PROFILE && item.targetId)
      .map((item) => item.targetId as string);

    const [posts, comments, profiles] = await Promise.all([
      postIds.length
        ? this.prisma.post.findMany({
            where: { id: { in: postIds } },
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: { select: { id: true, handle: true, name: true } },
              course: { select: { id: true, name: true } },
            },
          })
        : [],
      commentIds.length
        ? this.prisma.comment.findMany({
            where: { id: { in: commentIds } },
            select: {
              id: true,
              postId: true,
              content: true,
              createdAt: true,
              user: { select: { id: true, handle: true, name: true } },
            },
          })
        : [],
      profileIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: profileIds } },
            select: { id: true, handle: true, name: true, createdAt: true },
          })
        : [],
    ]);

    const postById = new Map(posts.map((item) => [item.id, item]));
    const commentById = new Map(comments.map((item) => [item.id, item]));
    const profileById = new Map(profiles.map((item) => [item.id, item]));

    return {
      items: reports.map((report) => {
        const target =
          report.targetType === ReportTargetType.POST
            ? postById.get(report.targetId ?? '')
            : report.targetType === ReportTargetType.COMMENT
              ? commentById.get(report.targetId ?? '')
              : report.targetType === ReportTargetType.PROFILE
                ? profileById.get(report.targetId ?? '')
                : null;

        return {
          ...report,
          target: target ?? null,
          targetExists:
            report.targetType === ReportTargetType.OTHER
              ? Boolean(report.targetUrl)
              : Boolean(target),
        };
      }),
    };
  }

  async updateReportStatus(reportId: string, status: unknown) {
    const id = reportId?.trim();
    const next = typeof status === 'string' ? status.trim().toUpperCase() : '';
    if (!id) throw new BadRequestException('Missing report id');
    const moderationStatuses = new Set<ReportStatus>([
      ReportStatus.REVIEWED,
      ReportStatus.DISMISSED,
    ]);
    if (!moderationStatuses.has(next as ReportStatus)) {
      throw new BadRequestException('Invalid moderation status');
    }

    const existing = await this.prisma.contentReport.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Report not found');

    const report = await this.prisma.contentReport.update({
      where: { id },
      data: {
        status: next as ReportStatus,
        reviewedAt: new Date(),
      },
      select: { id: true, status: true, reviewedAt: true },
    });

    return { ok: true, report };
  }

  async removeReportedTarget(reportId: string) {
    const id = reportId?.trim();
    if (!id) throw new BadRequestException('Missing report id');

    const report = await this.prisma.contentReport.findUnique({
      where: { id },
      select: { id: true, targetType: true, targetId: true },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (!report.targetId) throw new BadRequestException('Report has no target id');

    const resolveReport = () =>
      this.prisma.contentReport.update({
        where: { id },
        data: { status: ReportStatus.REVIEWED, reviewedAt: new Date() },
      });

    if (report.targetType === ReportTargetType.POST) {
      const target = await this.prisma.post.findUnique({
        where: { id: report.targetId },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Reported post not found');

      await this.prisma.$transaction([
        this.prisma.post.delete({ where: { id: report.targetId } }),
        resolveReport(),
      ]);
    } else if (report.targetType === ReportTargetType.COMMENT) {
      const target = await this.prisma.comment.findUnique({
        where: { id: report.targetId },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Reported comment not found');

      await this.prisma.$transaction([
        this.prisma.comment.delete({ where: { id: report.targetId } }),
        resolveReport(),
      ]);
    } else {
      throw new BadRequestException('Only posts and comments can be removed here');
    }

    return { ok: true, removedType: report.targetType, removedId: report.targetId };
  }
}
