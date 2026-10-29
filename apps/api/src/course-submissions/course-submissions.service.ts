import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseSubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateCourseSubmissionInput = {
  name?: string;
  country?: string;
  city?: string;
  region?: string;
  website?: string;
  lat?: number | string | string[] | null;
  lon?: number | string | string[] | null;
  holes?: number | string | string[] | null;
  par?: number | string | string[] | null;
  notes?: string;
  imageUrl?: string;
  images?: CourseSubmissionImageInput[];
  submittedByUserId?: string | null;
};

type CourseSubmissionImageInput = {
  url: string;
  path: string;
  originalName?: string | null;
  mimeType: string;
  size: number;
};

function cleanString(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function cleanNumber(value: unknown) {
  const scalar = Array.isArray(value)
    ? value.find((item) => String(item ?? '').trim() !== '')
    : value;

  if (scalar === null || scalar === undefined) return null;

  const text = String(scalar).trim();
  if (!text) return null;

  const n = Number(text);
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

const commonCourseNameWords =
  /\b(?:golf\s+club|golf\s+resort|country\s+club|golf|resort|club)\b|\bg\.?\s*c\.?(?=\s|$)/g;

function normalizeCourseName(name: string) {
  return name
    .toLowerCase()
    .replace(commonCourseNameWords, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function areDuplicateNames(a: string, b: string) {
  const normalizedA = normalizeCourseName(a);
  const normalizedB = normalizeCourseName(b);

  if (!normalizedA || !normalizedB) return false;

  return (
    normalizedA === normalizedB ||
    normalizedA.includes(normalizedB) ||
    normalizedB.includes(normalizedA)
  );
}

function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
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
        images: input.images?.length
          ? {
              create: input.images,
            }
          : undefined,
      },
      include: {
        images: true,
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
        images: {
          orderBy: { createdAt: 'asc' },
        },
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

  async approve(id: string) {
    const submission = await this.prisma.courseSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Course submission not found');
    }

    if (submission.status !== CourseSubmissionStatus.PENDING) {
      throw new BadRequestException(
        'Only pending course submissions can be approved',
      );
    }

    if (!Number.isFinite(submission.lat) || !Number.isFinite(submission.lon)) {
      throw new BadRequestException(
        'Course submission needs valid latitude and longitude before approval',
      );
    }

    const lat = submission.lat as number;
    const lon = submission.lon as number;
    const closeDistanceKm = 0.1;

    const sameCountryCourses = await this.prisma.course.findMany({
      where: {
        country: submission.country,
      },
      select: {
        id: true,
        name: true,
        country: true,
        city: true,
        region: true,
        lat: true,
        lon: true,
      },
    });

    const duplicateCourse = sameCountryCourses.find((course) => {
      return (
        distanceKm({ lat: course.lat, lon: course.lon }, { lat, lon }) <
          closeDistanceKm && areDuplicateNames(course.name, submission.name)
      );
    });

    if (duplicateCourse) {
      return {
        duplicateFound: true,
        message:
          'A course with the same country, similar name, and nearby coordinates already exists.',
        submission,
        duplicateCourse,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          name: submission.name,
          country: submission.country,
          city: submission.city,
          region: submission.region,
          website: submission.website,
          lat,
          lon,
          holes: submission.holes,
          par: submission.par,
          source: 'submission',
          verified: false,
          active: true,
        },
      });

      const approvedSubmission = await tx.courseSubmission.update({
        where: { id },
        data: { status: CourseSubmissionStatus.APPROVED },
      });

      return {
        duplicateFound: false,
        course,
        submission: approvedSubmission,
      };
    });
  }

  async reject(id: string) {
    const submission = await this.prisma.courseSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Course submission not found');
    }

    if (submission.status !== CourseSubmissionStatus.PENDING) {
      throw new BadRequestException(
        'Only pending course submissions can be rejected',
      );
    }

    return this.prisma.courseSubmission.update({
      where: { id },
      data: { status: CourseSubmissionStatus.REJECTED },
    });
  }
}
