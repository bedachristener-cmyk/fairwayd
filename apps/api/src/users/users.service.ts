import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

function normalizeHandle(input: string) {
  return (input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
        termsAcceptedAt: true,
        termsVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!me) throw new NotFoundException('User not found');
    return me;
  }

  async acceptTerms(userId: string, termsVersion: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: new Date(),
        termsVersion,
      },
      select: {
        id: true,
        email: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
        termsAcceptedAt: true,
        termsVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(
    userId: string,
    params: { handle: string; name?: string | null },
  ) {
    const safeHandle = normalizeHandle(params.handle);

    if (!safeHandle) {
      throw new ConflictException('Invalid handle');
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          handle: safeHandle,
          name:
            typeof params.name === 'string'
              ? params.name.trim()
              : (params.name ?? undefined),
        },
        select: {
          id: true,
          email: true,
          handle: true,
          name: true,
          avatarUrl: true,
          privacy: true,
          termsAcceptedAt: true,
          termsVersion: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Handle already taken');
      }
      throw e;
    }
  }

  async setAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
        termsAcceptedAt: true,
        termsVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // =========================================================
  // Profile + posts by handle
  // =========================================================

  async getByHandle(handle: string) {
    const safeHandle = normalizeHandle(handle);

    if (!safeHandle) throw new NotFoundException('User not found');

    const user = await this.prisma.user.findUnique({
      where: { handle: safeHandle },
      select: {
        id: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getPostsByHandle(viewerUserId: string, handle: string) {
    const safeHandle = normalizeHandle(handle);

    if (!safeHandle) throw new NotFoundException('User not found');

    const profileUser = await this.prisma.user.findUnique({
      where: { handle: safeHandle },
      select: { id: true, handle: true },
    });

    if (!profileUser) throw new NotFoundException('User not found');

    const isSelf = viewerUserId === profileUser.id;

    return this.prisma.post.findMany({
      where: {
        userId: profileUser.id,
        ...(isSelf ? {} : { visibility: 'PUBLIC' }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        visibility: true,
        course: { select: { id: true, name: true, lat: true, lon: true } },
        user: { select: { id: true, handle: true, avatarUrl: true } },
        images: { select: { id: true, url: true } },
      },
    });
  }
}
