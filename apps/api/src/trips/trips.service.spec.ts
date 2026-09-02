import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, TripRole } from '@prisma/client';
import { TripsService } from './trips.service';

function createService(prismaOverrides: Record<string, any> = {}) {
  const prisma = {
    trip: {
      findUnique: jest.fn(),
    },
    tripActivity: {
      create: jest.fn(),
    },
    tripInvite: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    tripMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        name: 'Organizer',
        handle: 'organizer',
        email: 'organizer@example.com',
      }),
    },
    ...prismaOverrides,
  };
  const notifications = {
    createNotification: jest.fn(),
  };

  return {
    prisma,
    notifications,
    service: new TripsService(prisma as any, notifications as any),
  };
}

function mockOrganizer(prisma: any) {
  prisma.tripMember.findUnique.mockResolvedValue({
    id: 'organizer-member',
    role: TripRole.ADMIN,
  });
}

describe('TripsService notifications', () => {
  describe('addMember', () => {
    it('creates exactly one notification when a registered user is added', async () => {
      const { prisma, notifications, service } = createService();
      const member = {
        id: 'member-1',
        tripId: 'trip-1',
        userId: 'added-user',
        isGuest: false,
        role: TripRole.MEMBER,
      };
      mockOrganizer(prisma);
      prisma.tripMember.create.mockResolvedValue(member);

      await expect(
        service.addMember('trip-1', 'organizer', {
          userId: 'added-user',
          role: TripRole.MEMBER,
        }),
      ).resolves.toEqual(member);

      expect(notifications.createNotification).toHaveBeenCalledTimes(1);
      expect(notifications.createNotification).toHaveBeenCalledWith({
        userId: 'added-user',
        type: 'trip_member_added',
        title: 'Added to trip',
        body: 'Someone added you to a trip.',
        link: '/trips/trip-1',
      });
    });

    it('does not notify when a guest member is added', async () => {
      const { prisma, notifications, service } = createService();
      const member = {
        id: 'guest-member',
        tripId: 'trip-1',
        displayName: 'Guest Player',
        isGuest: true,
        role: TripRole.MEMBER,
      };
      mockOrganizer(prisma);
      prisma.tripMember.findFirst.mockResolvedValue(null);
      prisma.tripMember.create.mockResolvedValue(member);

      await expect(
        service.addMember('trip-1', 'organizer', {
          displayName: 'Guest Player',
          role: TripRole.MEMBER,
        }),
      ).resolves.toEqual(member);

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it('does not notify on duplicate registered member attempts', async () => {
      const { prisma, notifications, service } = createService();
      mockOrganizer(prisma);
      prisma.tripMember.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.addMember('trip-1', 'organizer', {
          userId: 'existing-user',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it('does not notify when registered member creation fails for an invalid user', async () => {
      const { prisma, notifications, service } = createService();
      mockOrganizer(prisma);
      prisma.tripMember.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.addMember('trip-1', 'organizer', {
          userId: 'missing-user',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('joinInvite', () => {
    it('does not create trip_member_added when a user joins via invite link', async () => {
      const { prisma, notifications, service } = createService();
      const member = {
        id: 'member-1',
        tripId: 'trip-1',
        userId: 'joining-user',
        isGuest: false,
        role: TripRole.MEMBER,
      };
      prisma.tripInvite.findUnique.mockResolvedValue({
        id: 'invite-1',
        token: 'invite-token',
        tripId: 'trip-1',
        revokedAt: null,
        expiresAt: null,
        trip: {
          id: 'trip-1',
          title: 'Pattaya Golf',
          destination: 'Thailand',
          coverImageUrl: null,
          _count: { members: 1, items: 0 },
        },
      });
      prisma.tripMember.findUnique.mockResolvedValue(null);
      prisma.tripMember.create.mockResolvedValue(member);

      await expect(
        service.joinInvite('invite-token', 'joining-user'),
      ).resolves.toEqual({
        tripId: 'trip-1',
        member,
        alreadyMember: false,
      });

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('invite links', () => {
    it('does not notify when returning an existing invite link', async () => {
      const { prisma, notifications, service } = createService();
      const invite = {
        id: 'invite-1',
        tripId: 'trip-1',
        token: 'invite-token',
      };
      mockOrganizer(prisma);
      prisma.tripInvite.findFirst.mockResolvedValue(invite);

      await expect(
        service.getOrCreateInvite('trip-1', 'organizer'),
      ).resolves.toEqual(invite);

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it('does not notify when creating a new invite link', async () => {
      const { prisma, notifications, service } = createService();
      const invite = {
        id: 'invite-1',
        tripId: 'trip-1',
        token: 'invite-token',
      };
      mockOrganizer(prisma);
      prisma.tripInvite.findFirst.mockResolvedValue(null);
      prisma.tripInvite.create.mockResolvedValue(invite);

      await expect(
        service.getOrCreateInvite('trip-1', 'organizer'),
      ).resolves.toEqual(invite);

      expect(notifications.createNotification).not.toHaveBeenCalled();
    });
  });
});
