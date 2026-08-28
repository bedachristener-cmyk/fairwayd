import { FieldPrivacy, FollowStatus, Visibility } from '@prisma/client';
import { UsersService } from './users.service';

function createService(prismaOverrides: Record<string, any> = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    follow: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
    },
    ...prismaOverrides,
  } as any;

  const notifications = {
    createNotification: jest.fn(),
  } as any;

  return {
    prisma,
    notifications,
    service: new UsersService(prisma, notifications),
  };
}

const profileUser = {
  id: 'profile-user',
  handle: 'alyssa',
  name: 'Alyssa Christener',
  avatarUrl: 'avatar.jpg',
  privacy: 'PRIVATE',
  bio: 'Public bio',
  handicap: 4.2,
  homeGolfClub: 'Followers Club',
  golfSlogan: 'Private slogan',
  favoriteGolfDestination: 'Followers destination',
  bioPrivacy: FieldPrivacy.PUBLIC,
  handicapPrivacy: FieldPrivacy.FOLLOWERS,
  homeGolfClubPrivacy: FieldPrivacy.FOLLOWERS,
  golfSloganPrivacy: FieldPrivacy.PRIVATE,
  favoriteGolfDestinationPrivacy: FieldPrivacy.FOLLOWERS,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('UsersService social/privacy regressions', () => {
  describe('getPostsByHandle', () => {
    it('lets the owner see PUBLIC, FOLLOWERS, and PRIVATE profile posts', async () => {
      const { prisma, service } = createService();
      prisma.user.findUnique.mockResolvedValue(profileUser);
      prisma.post.findMany.mockResolvedValue([]);

      await service.getPostsByHandle('profile-user', 'alyssa');

      expect(prisma.follow.findFirst).not.toHaveBeenCalled();
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'profile-user' },
        }),
      );
    });

    it('lets an accepted follower see PUBLIC and FOLLOWERS profile posts', async () => {
      const { prisma, service } = createService();
      prisma.user.findUnique.mockResolvedValue(profileUser);
      prisma.follow.findFirst.mockResolvedValue({ id: 'follow-1' });
      prisma.post.findMany.mockResolvedValue([]);

      await service.getPostsByHandle('accepted-follower', 'alyssa');

      expect(prisma.follow.findFirst).toHaveBeenCalledWith({
        where: {
          followerId: 'accepted-follower',
          followingId: 'profile-user',
          status: FollowStatus.ACCEPTED,
        },
        select: { id: true },
      });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'profile-user',
            visibility: { in: [Visibility.PUBLIC, Visibility.FOLLOWERS] },
          },
        }),
      );
    });

    it('lets pending followers and non-followers see PUBLIC posts only', async () => {
      const { prisma, service } = createService();
      prisma.user.findUnique.mockResolvedValue(profileUser);
      prisma.follow.findFirst.mockResolvedValue(null);
      prisma.post.findMany.mockResolvedValue([]);

      await service.getPostsByHandle('pending-or-none', 'alyssa');

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'profile-user',
            visibility: { in: [Visibility.PUBLIC] },
          },
        }),
      );
    });
  });

  describe('getByHandle', () => {
    it('returns all profile field values to the owner', async () => {
      const { prisma, service } = createService();
      prisma.user.findUnique.mockResolvedValue(profileUser);

      const result = await service.getByHandle('profile-user', 'alyssa');

      expect(result.bio).toBe('Public bio');
      expect(result.handicap).toBe(4.2);
      expect(result.homeGolfClub).toBe('Followers Club');
      expect(result.golfSlogan).toBe('Private slogan');
      expect(result.favoriteGolfDestination).toBe('Followers destination');
      expect(prisma.follow.findFirst).not.toHaveBeenCalled();
    });

    it('returns PUBLIC and FOLLOWERS field values to accepted followers', async () => {
      const { prisma, service } = createService();
      prisma.user.findUnique.mockResolvedValue(profileUser);
      prisma.follow.findFirst.mockResolvedValue({ id: 'follow-1' });

      const result = await service.getByHandle('accepted-follower', 'alyssa');

      expect(result.bio).toBe('Public bio');
      expect(result.handicap).toBe(4.2);
      expect(result.homeGolfClub).toBe('Followers Club');
      expect(result.golfSlogan).toBeNull();
      expect(result.favoriteGolfDestination).toBe('Followers destination');
    });

    it('returns hidden profile field values as null to non-followers', async () => {
      const { prisma, service } = createService();
      prisma.user.findUnique.mockResolvedValue(profileUser);
      prisma.follow.findFirst.mockResolvedValue(null);

      const result = await service.getByHandle('non-follower', 'alyssa');

      expect(result.bio).toBe('Public bio');
      expect(result.handicap).toBeNull();
      expect(result.homeGolfClub).toBeNull();
      expect(result.golfSlogan).toBeNull();
      expect(result.favoriteGolfDestination).toBeNull();
      expect(result.handle).toBe('alyssa');
      expect(result.avatarUrl).toBe('avatar.jpg');
      expect(result.privacy).toBe('PRIVATE');
    });
  });

  describe('follow request workflow', () => {
    it('accepts a pending follow request and notifies the requester', async () => {
      const { prisma, notifications, service } = createService();
      prisma.follow.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        service.acceptFollowRequest('profile-user', 'requester-user'),
      ).resolves.toBe(true);

      expect(prisma.follow.updateMany).toHaveBeenCalledWith({
        where: {
          followingId: 'profile-user',
          followerId: 'requester-user',
          status: FollowStatus.PENDING,
        },
        data: {
          status: FollowStatus.ACCEPTED,
          decidedAt: expect.any(Date),
        },
      });
      expect(notifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'requester-user',
          type: 'follow_request_accepted',
        }),
      );
    });

    it('rejects a pending follow request', async () => {
      const { prisma, service } = createService();
      prisma.follow.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        service.rejectFollowRequest('profile-user', 'requester-user'),
      ).resolves.toBe(true);

      expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
        where: {
          followingId: 'profile-user',
          followerId: 'requester-user',
          status: FollowStatus.PENDING,
        },
      });
    });

    it('cancels a pending sent request through unfollowUser', async () => {
      const { prisma, service } = createService();
      prisma.follow.deleteMany.mockResolvedValue({ count: 1 });

      await service.unfollowUser('requester-user', 'profile-user');

      expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
        where: {
          followerId: 'requester-user',
          followingId: 'profile-user',
        },
      });
    });

    it('unfollows an accepted relationship through unfollowUser', async () => {
      const { prisma, service } = createService();
      prisma.follow.deleteMany.mockResolvedValue({ count: 1 });

      await service.unfollowUser('accepted-follower', 'profile-user');

      expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
        where: {
          followerId: 'accepted-follower',
          followingId: 'profile-user',
        },
      });
    });
  });
});
