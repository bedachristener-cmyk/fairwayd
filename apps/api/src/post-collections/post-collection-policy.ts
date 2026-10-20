import { BadRequestException } from '@nestjs/common';
import { Prisma, Visibility } from '@prisma/client';

export const POST_COLLECTION_NAME_MAX_LENGTH = 60;

export function normalizePostCollectionName(value: unknown) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Collection name is required');
  }

  const name = value.trim().replace(/\s+/g, ' ');

  if (!name) {
    throw new BadRequestException('Collection name is required');
  }

  if (name.length > POST_COLLECTION_NAME_MAX_LENGTH) {
    throw new BadRequestException(
      `Collection name must not exceed ${POST_COLLECTION_NAME_MAX_LENGTH} characters`,
    );
  }

  return name;
}

export function visiblePostWhere(userId: string): Prisma.PostWhereInput {
  return {
    OR: [
      { userId },
      { visibility: Visibility.PUBLIC },
      {
        visibility: Visibility.FOLLOWERS,
        user: {
          followers: {
            some: {
              followerId: userId,
              status: 'ACCEPTED',
            },
          },
        },
      },
    ],
  };
}
