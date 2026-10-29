import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { TripRole, TripItemExpenseType } from '@prisma/client';
import { TripsService, spectatorTrip } from './trips.service';

function setup(role: TripRole = TripRole.VIEWER) {
  const prisma = { tripMember: { findUnique: jest.fn().mockResolvedValue({ id: 'membership', role }), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn() }, trip: { findUnique: jest.fn() } };
  return { prisma, service: new TripsService(prisma as any, { createNotification: jest.fn() } as any) };
}

describe('Trip spectators', () => {
  const trip = { id: 'trip', title: 'Thailand', destination: 'Thailand', description: 'private booking note', baseCurrency: 'CHF', documents: [{ fileUrl: 'secret.pdf' }], members: [{ userId: 'viewer', role: TripRole.VIEWER }], items: [
    { id: 'shared', visibility: 'GROUP', title: 'Golf', type: 'COURSE', date: '2026-12-01', amount: 500, bookingRef: 'SECRET', notes: 'private information', costs: [{ amount: 300 }], documentLinks: [{ id: 'secret' }], participants: [{ userId: 'participant' }], course: { id: 'course', name: 'Seapine', posts: [{ body: 'hidden' }] } },
    { id: 'private', visibility: 'PRIVATE' }, { id: 'selected', visibility: 'SELECTED' },
  ] };

  it('exposes only shared itinerary fields, with no nested costs, documents or private posts', () => {
    const result = spectatorTrip(trip);
    expect(result.items.map((item: any) => item.id)).toEqual(['shared']);
    expect(result).toMatchObject({ viewerRole: 'VIEWER', members: [], _count: { items: 1 } });
    for (const key of ['amount', 'bookingRef', 'notes', 'costs', 'documentLinks', 'participants', 'posts', 'description', 'baseCurrency', 'documents']) expect(JSON.stringify(result)).not.toContain(`"${key}"`);
  });

  it('includes safe course map data and member display fields without private user data', () => {
    const result = spectatorTrip({ ...trip, members: [{ id: 'owner', userId: 'owner', role: TripRole.OWNER, user: { id: 'owner', name: 'Organizer', email: 'private@example.com', passwordHash: 'secret' } }], items: [{ ...trip.items[0], course: { id: 'course', name: 'Seapine', lat: 12.5, lon: 99.9, website: 'https://example.com', posts: [{ body: 'private' }] } }] });
    expect(result.items[0].course).toMatchObject({ lat: 12.5, lon: 99.9 });
    expect(result.members[0].user).toMatchObject({ name: 'Organizer' });
    expect(JSON.stringify(result)).not.toContain('private@example.com');
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('posts');
  });

  it('returns the restricted projection when a spectator opens a trip', async () => {
    const { prisma, service } = setup(); prisma.trip.findUnique.mockResolvedValue(trip);
    expect(await service.findOne('trip', 'viewer')).toEqual(spectatorTrip(trip));
  });

  it.each(['assertCanManageTrip', 'findMyCosts', 'findOrganizerCosts', 'findMembers', 'findDocuments', 'findDocument', 'findDocumentFile', 'updateDocumentVisibility', 'deleteDocument', 'findActivity', 'assertCanManageDocuments', 'createDocument', 'createItem', 'updateItem', 'moveItem', 'deleteItem'])('denies spectator access to %s before reading or changing protected data', async (method) => {
    const { service } = setup();
    await expect((service as any)[method]('trip', 'viewer', {})).rejects.toThrow(ForbiddenException);
  });

  it('rejects explicit spectator payers and participants, and excludes them from defaults', async () => {
    const { service, prisma } = setup(TripRole.ADMIN);
    prisma.tripMember.findFirst.mockResolvedValue(null);
    await expect((service as any).resolveOptionalTripMemberId('trip', 'spectator')).rejects.toThrow(BadRequestException);
    expect(prisma.tripMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'spectator', tripId: 'trip', role: { not: TripRole.VIEWER } } }));
    await expect((service as any).resolveParticipantMemberIds('trip', { participantMemberIds: ['spectator'] })).rejects.toThrow(BadRequestException);
    expect(prisma.tripMember.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ role: { not: TripRole.VIEWER } }) }));
    await (service as any).resolveExpenseParticipantMemberIds('trip', {}, TripItemExpenseType.SHARED, null, 'admin', true);
    expect(prisma.tripMember.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { tripId: 'trip', role: { not: TripRole.VIEWER } } }));
  });
});

describe('Adding spectators', () => {
  it('allows an organizer to add a registered viewer without making them a participant', async () => {
    const { prisma, service } = setup(TripRole.ADMIN);
    prisma.tripMember.create.mockResolvedValue({ id: 'spectator-member', userId: 'spectator', role: TripRole.VIEWER });
    (prisma as any).user = { findUnique: jest.fn().mockResolvedValue({ name: 'Organizer' }) };
    (prisma as any).tripActivity = { create: jest.fn().mockResolvedValue({}) };
    await service.addMember('trip', 'organizer', { userId: 'spectator', role: TripRole.VIEWER });
    expect(prisma.tripMember.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: TripRole.VIEWER, isGuest: false }) }));
  });
  it('requires a real account for a spectator', async () => {
    const { service, prisma } = setup(TripRole.ADMIN);
    await expect(service.addMember('trip', 'organizer', { displayName: 'Guest', role: TripRole.VIEWER })).rejects.toThrow('Fairwayd account');
    expect(prisma.tripMember.create).not.toHaveBeenCalled();
  });
  it('does not convert an existing financial participant into a spectator', async () => {
    const { service, prisma } = setup(TripRole.ADMIN);
    prisma.tripMember.findFirst.mockResolvedValue({ id: 'participant', role: TripRole.MEMBER });
    await expect(service.updateMember('trip', 'participant', 'organizer', { role: TripRole.VIEWER })).rejects.toThrow('cannot be converted');
  });
});
