import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const destinations = await this.prisma.destination.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
      },
    });

    const items = await Promise.all(
      destinations.map(async (destination) => {
        const courseCount = await this.prisma.course.count({
          where: {
            country: destination.code,
          },
        });

        return {
          ...destination,
          courseCount,
        };
      }),
    );

    return { items };
  }
  async findBySlug(slug: string) {
    const destination = await this.prisma.destination.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
      },
    });

    if (!destination) {
      return null;
    }

    const courseCount = await this.prisma.course.count({
      where: {
        country: destination.code,
      },
    });

    return {
      ...destination,
      courseCount,
    };
  }
  async getPostsBySlug(slug: string) {
    const destination = await this.prisma.destination.findUnique({
      where: { slug },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    const items = await this.prisma.post.findMany({
      where: {
        course: {
          country: destination.code,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            avatarUrl: true,
            privacy: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            country: true,
            region: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return {
      destination: {
        id: destination.id,
        code: destination.code,
        name: destination.name,
        slug: destination.slug,
      },
      items,
    };
  }
}
