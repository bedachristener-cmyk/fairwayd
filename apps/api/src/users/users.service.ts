import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
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
    const safeHandle = params.handle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20);

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
        // handle unique collision
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
}
