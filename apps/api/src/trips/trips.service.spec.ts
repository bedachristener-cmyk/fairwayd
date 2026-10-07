import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, TripItemCostMode, TripItemPaymentMode, TripRole } from '@prisma/client';
import { TripsService } from './trips.service';

function createService(prismaOverrides: Record<string, any> = {}) {
  const prisma = {
    trip: {
      findUnique: jest.fn(),
      create: jest.fn(),
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
      findMany: jest.fn(),
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

describe('TripsService preferred currency defaults', () => {
  it('falls back to CHF when the user has no preference', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({ preferredCurrency: null });
    prisma.trip.create.mockResolvedValue({ id: 'trip-chf' });

    await service.create('user-1', { title: 'Swiss trip' });

    expect(prisma.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ baseCurrency: 'CHF' }),
      }),
    );
  });

  it('uses the saved preference when no trip currency is provided', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({ preferredCurrency: 'EUR' });
    prisma.trip.create.mockResolvedValue({ id: 'trip-eur' });

    await service.create('user-1', { title: 'Euro trip' });

    expect(prisma.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ baseCurrency: 'EUR' }),
      }),
    );
  });

  it('keeps explicit CHF over a saved EUR preference', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({ preferredCurrency: 'EUR' });
    prisma.trip.create.mockResolvedValue({ id: 'trip-chf-explicit' });

    await service.create('user-1', {
      title: 'Swiss trip',
      baseCurrency: 'CHF',
    });

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ baseCurrency: 'CHF' }),
      }),
    );
  });

  it('normalizes a supported explicit trip currency', async () => {
    const { prisma, service } = createService();
    prisma.trip.create.mockResolvedValue({ id: 'trip-eur-explicit' });

    await service.create('user-1', {
      title: 'Euro trip',
      baseCurrency: 'eur',
    });

    expect(prisma.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ baseCurrency: 'EUR' }),
      }),
    );
  });

  it('rejects an unsupported explicit trip currency', async () => {
    const { prisma, service } = createService();

    await expect(
      service.create('user-1', { title: 'Invalid trip', baseCurrency: 'XYZ' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.trip.create).not.toHaveBeenCalled();
  });
});

describe('TripsService foreign-currency cost snapshots', () => {
  function setupCostResolution() {
    const context = createService();
    context.prisma.trip.findUnique.mockResolvedValue({ baseCurrency: 'CHF' });
    context.prisma.tripMember.findMany.mockResolvedValue([
      { id: 'member-1', userId: 'user-1' },
      { id: 'member-2', userId: 'user-2' },
    ]);
    return context;
  }

  it('derives and persists baseAmount from a supplied foreign exchange rate', async () => {
    const { service } = setupCostResolution();
    const costs = await (service as any).resolveTripItemCosts(
      'trip-1',
      {},
      [
        {
          label: 'Greenfee',
          amount: 9400,
          currency: 'THB',
          exchangeRate: 0.0224,
          costMode: TripItemCostMode.TOTAL,
          paymentMode: TripItemPaymentMode.EACH_PAYS_OWN,
          participantMemberIds: ['member-1', 'member-2'],
        },
      ],
      null,
      undefined,
      'member-1',
      false,
    );

    expect(costs[0]).toEqual(
      expect.objectContaining({
        amount: 9400,
        currency: 'THB',
        exchangeRate: 0.0224,
        baseAmount: 210.56,
      }),
    );
  });

  it('does not trust a conflicting client baseAmount when a foreign rate is supplied', async () => {
    const { service } = setupCostResolution();
    const costs = await (service as any).resolveTripItemCosts(
      'trip-1',
      {},
      [
        {
          label: 'Greenfee',
          amount: 9400,
          currency: 'THB',
          exchangeRate: 0.0224,
          baseAmount: 9999,
          participantMemberIds: ['member-1', 'member-2'],
        },
      ],
      null,
      undefined,
      'member-1',
      false,
    );

    expect(costs[0]).toEqual(
      expect.objectContaining({
        exchangeRate: 0.0224,
        baseAmount: 210.56,
      }),
    );
  });

  it('preserves a baseAmount-only foreign snapshot and derives its rate', async () => {
    const { service } = setupCostResolution();
    const costs = await (service as any).resolveTripItemCosts(
      'trip-1',
      {},
      [
        {
          label: 'Greenfee',
          amount: 9400,
          currency: 'THB',
          baseAmount: 210.56,
          participantMemberIds: ['member-1', 'member-2'],
        },
      ],
      null,
      undefined,
      'member-1',
      false,
    );

    expect(costs[0].baseAmount).toBe(210.56);
    expect(costs[0].exchangeRate).toBeCloseTo(0.0224, 10);
  });

  it('normalizes a base-currency cost to rate 1 and its original amount', async () => {
    const { service } = setupCostResolution();
    const costs = await (service as any).resolveTripItemCosts(
      'trip-1',
      {},
      [
        {
          label: 'Hotel',
          amount: 220,
          currency: 'CHF',
          exchangeRate: 9,
          baseAmount: 999,
          participantMemberIds: ['member-1'],
        },
      ],
      null,
      undefined,
      'member-1',
      false,
    );

    expect(costs[0]).toEqual(
      expect.objectContaining({ exchangeRate: 1, baseAmount: 220 }),
    );
  });

  it('rejects a new foreign cost with neither exchangeRate nor baseAmount', async () => {
    const { service } = setupCostResolution();

    await expect(
      (service as any).resolveTripItemCosts(
        'trip-1',
        {},
        [
          {
            label: 'Greenfee',
            amount: 9400,
            currency: 'THB',
            participantMemberIds: ['member-1', 'member-2'],
          },
        ],
        null,
        undefined,
        'member-1',
        false,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

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
