import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TripDocumentVisibility,
  TripItemCostMode,
  TripItemPaymentMode,
  TripRole,
} from '@prisma/client';
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
    tripDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

describe('TripsService trip document visibility', () => {
  const membership = { id: 'member-1', role: TripRole.MEMBER };
  const document = {
    id: 'document-1',
    tripId: 'trip-1',
    title: 'Booking confirmation',
    fileUrl: 'https://storage.example/private/document.pdf',
    fileName: 'document.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1200,
    uploadedByUserId: 'owner-1',
    visibility: TripDocumentVisibility.SHARED,
    visibilityMembers: [],
    itemLinks: [],
    uploadedBy: null,
  };

  function setup() {
    const context = createService();
    context.prisma.tripMember.findUnique.mockResolvedValue(membership);
    return context;
  }

  it('lists group documents for trip members without exposing the storage URL', async () => {
    const { prisma, service } = setup();
    prisma.tripDocument.findMany.mockResolvedValue([document]);

    await expect(service.findDocuments('trip-1', 'user-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'document-1',
        visibility: TripDocumentVisibility.SHARED,
        downloadPath: '/trips/trip-1/documents/document-1/file',
      }),
    ]);
    expect(
      (await service.findDocuments('trip-1', 'user-1'))[0],
    ).not.toHaveProperty('fileUrl');
  });

  it('allows a trip member to retrieve group document metadata and bytes', async () => {
    const { prisma, service } = setup();
    prisma.tripDocument.findFirst.mockResolvedValue(document);

    await expect(
      service.findDocument('trip-1', 'document-1', 'user-1'),
    ).resolves.toEqual(
      expect.objectContaining({ id: 'document-1', downloadPath: expect.any(String) }),
    );
    await expect(
      service.findDocumentFile('trip-1', 'document-1', 'user-1'),
    ).resolves.toEqual(document);
  });

  it('scopes selected-member documents to the current trip membership', async () => {
    const { prisma, service } = setup();
    prisma.tripDocument.findMany.mockResolvedValue([
      {
        ...document,
        visibility: TripDocumentVisibility.SELECTED,
        visibilityMembers: [{ tripMemberId: 'member-1' }],
      },
    ]);

    await service.findDocuments('trip-1', 'user-1');

    expect(prisma.tripDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tripId: 'trip-1',
          OR: expect.arrayContaining([
            {
              visibility: TripDocumentVisibility.SELECTED,
              visibilityMembers: { some: { tripMemberId: 'member-1' } },
            },
          ]),
        }),
      }),
    );
  });

  it('denies attachment listing to users outside the trip', async () => {
    const { prisma, service } = createService();
    prisma.tripMember.findUnique.mockResolvedValue(null);

    await expect(
      service.findDocuments('trip-1', 'outsider-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tripDocument.findMany).not.toHaveBeenCalled();
  });

  it('allows a selected member to retrieve a selected document', async () => {
    const { prisma, service } = setup();
    const selectedDocument = {
      ...document,
      visibility: TripDocumentVisibility.SELECTED,
      visibilityMembers: [{ tripMemberId: 'member-1' }],
    };
    prisma.tripDocument.findFirst.mockResolvedValue(selectedDocument);

    await expect(
      service.findDocument('trip-1', 'document-1', 'user-1'),
    ).resolves.toEqual(
      expect.objectContaining({ visibility: TripDocumentVisibility.SELECTED }),
    );
    await expect(
      service.findDocumentFile('trip-1', 'document-1', 'user-1'),
    ).resolves.toEqual(selectedDocument);
  });

  it('denies selected document metadata and bytes to an unselected trip member', async () => {
    const { prisma, service } = setup();
    prisma.tripMember.findUnique.mockResolvedValue({
      id: 'member-unselected',
      role: TripRole.MEMBER,
    });
    prisma.tripDocument.findFirst.mockResolvedValue(null);

    await expect(
      service.findDocument('trip-1', 'document-1', 'user-unselected'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.findDocumentFile('trip-1', 'document-1', 'user-unselected'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tripDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'document-1',
          tripId: 'trip-1',
          OR: expect.arrayContaining([
            {
              visibility: TripDocumentVisibility.SELECTED,
              visibilityMembers: {
                some: { tripMemberId: 'member-unselected' },
              },
            },
          ]),
        }),
      }),
    );
  });

  it('keeps private documents accessible to their uploader', async () => {
    const { prisma, service } = setup();
    prisma.tripDocument.findFirst.mockResolvedValue({
      ...document,
      visibility: TripDocumentVisibility.PRIVATE,
      uploadedByUserId: 'user-1',
    });

    await expect(
      service.findDocument('trip-1', 'document-1', 'user-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'document-1',
        visibility: TripDocumentVisibility.PRIVATE,
      }),
    );
    expect(prisma.tripDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ uploadedByUserId: 'user-1' }]),
        }),
      }),
    );
  });

  it('denies a private document to another valid trip member by document ID', async () => {
    const { prisma, service } = setup();
    prisma.tripDocument.findFirst.mockResolvedValue(null);

    await expect(
      service.findDocument('trip-1', 'private-document', 'member-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.findDocumentFile('trip-1', 'private-document', 'member-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each(['metadata', 'file'])(
    'denies unauthorized %s access without revealing document existence',
    async (accessKind) => {
      const { prisma, service } = setup();
      prisma.tripDocument.findFirst.mockResolvedValue(null);

      const request =
        accessKind === 'metadata'
          ? service.findDocument('trip-1', 'private-document', 'user-1')
          : service.findDocumentFile('trip-1', 'private-document', 'user-1');

      await expect(request).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('persists selected members independently from the parent trip item', async () => {
    const { prisma, service } = setup();
    prisma.tripDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      uploadedByUserId: 'user-1',
    });
    prisma.tripMember.findMany.mockResolvedValue([{ id: 'member-2' }]);
    prisma.tripDocument.update.mockResolvedValue({
      ...document,
      visibility: TripDocumentVisibility.SELECTED,
      visibilityMembers: [{ tripMemberId: 'member-2' }],
    });

    await service.updateDocumentVisibility('trip-1', 'document-1', 'user-1', {
      visibility: TripDocumentVisibility.SELECTED,
      visibleToMemberIds: ['member-2'],
    });

    expect(prisma.tripDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibility: TripDocumentVisibility.SELECTED,
          visibilityMembers: {
            deleteMany: {},
            create: [{ tripMemberId: 'member-2' }],
          },
        }),
      }),
    );
  });

  it.each([
    TripDocumentVisibility.SHARED,
    TripDocumentVisibility.PRIVATE,
  ])('clears stale selected members when visibility changes to %s', async (visibility) => {
    const { prisma, service } = setup();
    prisma.tripDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      uploadedByUserId: 'user-1',
    });
    prisma.tripDocument.update.mockResolvedValue({
      ...document,
      visibility,
      visibilityMembers: [],
    });

    await service.updateDocumentVisibility(
      'trip-1',
      'document-1',
      'user-1',
      { visibility, visibleToMemberIds: ['stale-member'] },
    );

    expect(prisma.tripDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibility,
          visibilityMembers: { deleteMany: {}, create: [] },
        }),
      }),
    );
    expect(prisma.tripMember.findMany).not.toHaveBeenCalled();
  });

  it('rejects selected members that do not belong to the document trip', async () => {
    const { prisma, service } = setup();
    prisma.tripDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      uploadedByUserId: 'user-1',
    });
    prisma.tripMember.findMany.mockResolvedValue([]);

    await expect(
      service.updateDocumentVisibility(
        'trip-1',
        'document-1',
        'user-1',
        {
          visibility: TripDocumentVisibility.SELECTED,
          visibleToMemberIds: ['member-from-another-trip'],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tripDocument.update).not.toHaveBeenCalled();
  });

  it('denies access after the selected user is removed from the trip', async () => {
    const { prisma, service } = createService();
    prisma.tripMember.findUnique.mockResolvedValue(null);

    await expect(
      service.findDocumentFile('trip-1', 'document-1', 'removed-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tripDocument.findFirst).not.toHaveBeenCalled();
  });

  it.each(['flight', 'hotel', 'golf_round', 'activity', 'note'])(
    'applies the same linked-document authorization to %s items',
    (type) => {
      const { service } = setup();
      const selectedDocument = {
        ...document,
        visibility: TripDocumentVisibility.SELECTED,
        visibilityMembers: [{ tripMemberId: 'member-1' }],
      };
      const item = {
        id: `item-${type}`,
        type,
        documentLinks: [
          { id: `link-${type}`, tripDocument: selectedDocument },
        ],
      };

      const visible = (service as any).filterTripItemDocumentsForUser(
        item,
        'user-1',
        'member-1',
      );
      const hidden = (service as any).filterTripItemDocumentsForUser(
        item,
        'different-user',
        'member-unselected',
      );

      expect(visible.documentLinks).toHaveLength(1);
      expect(visible.documentLinks[0].tripDocument).not.toHaveProperty(
        'fileUrl',
      );
      expect(hidden.documentLinks).toEqual([]);
    },
  );
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
        new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          {
            code: 'P2003',
            clientVersion: 'test',
          },
        ),
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
