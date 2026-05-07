import { BadRequestException, Injectable } from '@nestjs/common';
import { CourseSubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateCourseSubmissionInput = {
  name?: string;
  country?: string;
  city?: string;
  region?: string;
  website?: string;
  lat?: number | string | null;
  lon?: number | string | null;
  holes?: number | string | null;
  par?: number | string | null;
  notes?: string;
  imageUrl?: string;
  submittedByUserId?: string | null;
};

function cleanString(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanInt(value: unknown) {
  const n = cleanNumber(value);
  return n === null ? null : Math.trunc(n);
}

function parseStatus(value?: string) {
  const status = String(value || 'PENDING').toUpperCase();
  if (
    status === CourseSubmissionStatus.PENDING ||
    status === CourseSubmissionStatus.APPROVED ||
    status === CourseSubmissionStatus.REJECTED
  ) {
    return status;
  }

  return CourseSubmissionStatus.PENDING;
}

@Injectable()
export class CourseSubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateCourseSubmissionInput) {
    const name = cleanString(input.name);
    const country = cleanString(input.country)?.toUpperCase();

    if (!name) {
      throw new BadRequestException('Course name is required');
    }

    if (!country) {
      throw new BadRequestException('Country is required');
    }

    return this.prisma.courseSubmission.create({
      data: {
        name,
        country,
        city: cleanString(input.city),
        region: cleanString(input.region),
        website: cleanString(input.website),
        lat: cleanNumber(input.lat),
        lon: cleanNumber(input.lon),
        holes: cleanInt(input.holes),
        par: cleanInt(input.par),
        notes: cleanString(input.notes),
        imageUrl: cleanString(input.imageUrl),
        submittedByUserId: input.submittedByUserId || null,
        status: CourseSubmissionStatus.PENDING,
      },
    });
  }

  list(status?: string) {
    return this.prisma.courseSubmission.findMany({
      where: {
        status: parseStatus(status),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: {
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

  approve(id: string) {
    return this.prisma.courseSubmission.update({
      where: { id },
      data: { status: CourseSubmissionStatus.APPROVED },
    });
  }
}
