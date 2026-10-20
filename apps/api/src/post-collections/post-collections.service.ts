import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizePostCollectionName,
  visiblePostWhere,
} from './post-collection-policy';

const postInclude = {
  course: true,
  user: {
    select: {
      id: true,
      handle: true,
      name: true,
      avatarUrl: true,
    },
  },
  images: true,
  likes: {
    select: {
      userId: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
} satisfies Prisma.PostInclude;

@Injectable()
export class PostCollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireUserId(userId: string) {
    const value = userId?.trim();
    if (!value) throw new BadRequestException('Missing userId');
    return value;
  }

  private async requireOwnedCollection(userId: string, collectionId: string) {
    const collection = await this.prisma.postCollection.findFirst({
      where: {
        id: collectionId,
        userId,
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  async list(userId: string, postId?: string) {
    const ownerId = this.requireUserId(userId);
    const normalizedPostId = postId?.trim();

    const [collections, savedItems] = await Promise.all([
      this.prisma.postCollection.findMany({
        where: { userId: ownerId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      normalizedPostId
        ? this.prisma.postCollectionItem.findMany({
            where: {
              postId: normalizedPostId,
              collection: {
                userId: ownerId,
              },
            },
            select: {
              collectionId: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const savedCollectionIds = new Set(
      savedItems.map((item) => item.collectionId),
    );

    return {
      items: collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        postCount: collection._count.items,
        saved: savedCollectionIds.has(collection.id),
      })),
    };
  }

  async memberships(userId: string) {
    const ownerId = this.requireUserId(userId);
    const items = await this.prisma.postCollectionItem.findMany({
      where: {
        collection: {
          userId: ownerId,
        },
      },
      distinct: ['postId'],
      select: {
        postId: true,
      },
    });

    return {
      postIds: items.map((item) => item.postId),
    };
  }

  async create(userId: string, rawName: unknown) {
    const ownerId = this.requireUserId(userId);
    const name = normalizePostCollectionName(rawName);

    try {
      return await this.prisma.postCollection.create({
        data: {
          userId: ownerId,
          name,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'A collection with this name already exists',
        );
      }
      throw error;
    }
  }

  async rename(userId: string, collectionId: string, rawName: unknown) {
    const ownerId = this.requireUserId(userId);
    await this.requireOwnedCollection(ownerId, collectionId);
    const name = normalizePostCollectionName(rawName);

    try {
      return await this.prisma.postCollection.update({
        where: { id: collectionId },
        data: { name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'A collection with this name already exists',
        );
      }
      throw error;
    }
  }

  async remove(userId: string, collectionId: string) {
    const ownerId = this.requireUserId(userId);
    await this.requireOwnedCollection(ownerId, collectionId);
    await this.prisma.postCollection.delete({
      where: { id: collectionId },
    });
    return { deleted: true, id: collectionId };
  }

  async posts(userId: string, collectionId: string) {
    const ownerId = this.requireUserId(userId);
    const collection = await this.requireOwnedCollection(
      ownerId,
      collectionId,
    );

    const savedItems = await this.prisma.postCollectionItem.findMany({
      where: {
        collectionId,
        post: visiblePostWhere(ownerId),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: postInclude,
        },
      },
    });

    return {
      collection: {
        id: collection.id,
        name: collection.name,
      },
      items: savedItems.map((item) => ({
        ...item.post,
        savedAt: item.createdAt,
      })),
    };
  }

  async savePost(userId: string, collectionId: string, postId: string) {
    const ownerId = this.requireUserId(userId);
    await this.requireOwnedCollection(ownerId, collectionId);

    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        ...visiblePostWhere(ownerId),
      },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.$transaction([
      this.prisma.postCollectionItem.upsert({
        where: {
          collectionId_postId: {
            collectionId,
            postId,
          },
        },
        update: {},
        create: {
          collectionId,
          postId,
        },
      }),
      this.prisma.postCollection.update({
        where: { id: collectionId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      saved: true,
      collectionId,
      postId,
    };
  }

  async removePost(userId: string, collectionId: string, postId: string) {
    const ownerId = this.requireUserId(userId);
    await this.requireOwnedCollection(ownerId, collectionId);

    await this.prisma.$transaction([
      this.prisma.postCollectionItem.deleteMany({
        where: {
          collectionId,
          postId,
        },
      }),
      this.prisma.postCollection.update({
        where: { id: collectionId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      saved: false,
      collectionId,
      postId,
    };
  }
}
