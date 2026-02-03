import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
        createdAt: true,
      },
    });
  }

  async setAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        handle: true,
        name: true,
        avatarUrl: true,
        privacy: true,
      },
    });
  }
}
