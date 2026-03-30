import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    message?: string;
    category?: string;
    url?: string;
    device?: string;
    userAgent?: string;
    userId?: string;
  }) {
    const message = input?.message?.trim();

    if (!message) {
      throw new BadRequestException('Feedback message is required');
    }

    const category = (input?.category || 'other').trim().toLowerCase();
    const allowedCategories = ['bug', 'idea', 'ui', 'other'];
    const safeCategory = allowedCategories.includes(category)
      ? category
      : 'other';

    return this.prisma.feedback.create({
      data: {
        message,
        category: safeCategory,
        url: input?.url?.trim() || null,
        device: input?.device?.trim() || null,
        userAgent: input?.userAgent?.trim() || null,
        userId: input?.userId || null,
      },
    });
  }
  async list() {
    return this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      take: 200,
    });
  }
}
