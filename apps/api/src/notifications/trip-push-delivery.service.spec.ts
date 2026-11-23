import { TripPushDeliveryService } from './trip-push-delivery.service';
import { sendWebPush } from './web-push-transport';

jest.mock('./web-push-transport', () => ({
  sendWebPush: jest.fn(),
}));

const mockedSend = sendWebPush as jest.MockedFunction<typeof sendWebPush>;
const config = {
  TRIP_PUSH_DELIVERY_ENABLED: 'true',
  WEB_PUSH_PUBLIC_KEY: 'public',
  WEB_PUSH_PRIVATE_KEY: 'private',
  WEB_PUSH_SUBJECT: 'mailto:admin@example.com',
};

describe('TripPushDeliveryService', () => {
  const saved = { ...process.env };
  const prisma = {
    user: { findUnique: jest.fn() },
    tripMember: { findFirst: jest.fn() },
    pushSubscription: { findMany: jest.fn(), deleteMany: jest.fn() },
  };
  const subscription = {
    id: 'sub1', endpoint: 'https://push.example.com/a',
    p256dh: 'receiver-key', auth: 'receiver-auth',
  };
  const service = new TripPushDeliveryService(prisma as never);

  beforeEach(() => {
    process.env = { ...saved, ...config };
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ pushTripNotifications: true });
    prisma.tripMember.findFirst.mockResolvedValue({ id: 'member1' });
    prisma.pushSubscription.findMany.mockResolvedValue([subscription]);
    prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
    mockedSend.mockResolvedValue(undefined);
  });
  afterAll(() => { process.env = saved; });

  it('does nothing when rollout flag is off', async () => {
    process.env.TRIP_PUSH_DELIVERY_ENABLED = 'false';
    await service.deliverToUser('u1', 'trip1', 'Trip updated');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('never delivers to a user without opt-in', async () => {
    prisma.user.findUnique.mockResolvedValue({ pushTripNotifications: false });
    await service.deliverToUser('u1', 'trip1', 'Trip updated');
    expect(prisma.tripMember.findFirst).not.toHaveBeenCalled();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('rechecks membership and skips removed users', async () => {
    prisma.tripMember.findFirst.mockResolvedValue(null);
    await service.deliverToUser('u1', 'trip1', 'Trip updated');
    expect(prisma.tripMember.findFirst).toHaveBeenCalledWith({
      where: { tripId: 'trip1', userId: 'u1', isGuest: false },
      select: { id: true },
    });
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('sends only generic trip information', async () => {
    await service.deliverToUser('u1', 'trip1', 'Trip item updated');
    expect(mockedSend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockedSend.mock.calls[0][1]);
    expect(payload).toEqual({
      title: 'Trip item updated',
      path: '/trips/trip1',
      tag: 'fairwayd-trip-trip1',
    });
  });

  it('removes expired subscriptions on 410', async () => {
    mockedSend.mockRejectedValue({ statusCode: 410 });
    await service.deliverToUser('u1', 'trip1', 'Trip updated');
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { id: 'sub1', userId: 'u1' },
    });
  });

  it('does not delete subscriptions on transient delivery errors', async () => {
    mockedSend.mockRejectedValue({ statusCode: 503 });
    await expect(service.deliverToUser('u1', 'trip1', 'Trip updated')).resolves.toBeUndefined();
    expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });
});
