import { NotificationEmailService } from './notification-email.service';
import { NotificationsService } from './notifications.service';
import { notificationWebUrl, renderActivityEmail } from './activity-email';

function setup(type = 'trip_member_added') {
  const row = {
    id: 'note-1',
    userId: 'recipient',
    actorUserId: 'actor',
    type,
    title: 'Added to trip',
    body: 'Trip update',
    link: '/trips/trip-1',
    emailAttempts: 0,
  };
  const recipient = {
    name: 'Guest',
    email: 'recipient@example.test',
    emailVerifiedAt: new Date(),
    emailTripNotifications: true,
    emailFollowNotifications: true,
  };
  const prisma = {
    notification: {
      findMany: jest.fn().mockResolvedValue([row]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(
            where.id === 'recipient'
              ? recipient
              : { name: '<Actor>', handle: 'actor' },
          ),
        ),
      update: jest.fn().mockResolvedValue({}),
    },
    trip: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          title: 'Thailand & Golf',
          members: [{ id: 'membership' }],
        }),
    },
    follow: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          status: type === 'follow_request' ? 'PENDING' : 'ACCEPTED',
        }),
    },
  };
  const mail = {
    sendActivityNotification: jest.fn().mockResolvedValue('mail-id'),
  };
  return {
    row,
    recipient,
    prisma,
    mail,
    service: new NotificationEmailService(prisma as any, mail as any),
  };
}

describe('Notification emails', () => {
  it('never queues opted-out activity or unrelated notification types', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'new-note' });
    const findUnique = jest.fn().mockResolvedValue({ email: 'recipient@example.test', emailVerifiedAt: new Date(), emailTripNotifications: false, emailFollowNotifications: false });
    const service = new NotificationsService({ notification: { create }, user: { findUnique } } as any);
    for (const type of ['trip_member_added', 'follow_request', 'follow_request_accepted', 'new_follower', 'comment']) {
      await service.createNotification({ userId: 'recipient', actorUserId: 'actor', type, title: 'Activity' });
      expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ emailPending: false }) }));
    }
    findUnique.mockResolvedValue({ email: 'recipient@example.test', emailVerifiedAt: new Date(), emailTripNotifications: true, emailFollowNotifications: true });
    await service.createNotification({ userId: 'recipient', actorUserId: 'actor', type: 'trip_member_added', title: 'Activity' });
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ emailPending: true }) }));
  });
  const env = { ...process.env };
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.FRONTEND_URL = 'https://stage.example.test';
    delete process.env.NOTIFICATION_EMAILS_ENABLED;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it('sends a personalized trip message with the environment URL', async () => {
    const { service, mail, prisma } = setup();
    await service.deliverPending();
    expect(mail.sendActivityNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Thailand & Golf'),
        baseUrl: 'https://stage.example.test',
        notificationId: 'note-1',
      }),
    );
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'note-1' },
      data: { emailPending: false, emailSentAt: expect.any(Date) },
    });
  });

  it.each([
    'trip_member_added',
    'trip_member_removed',
    'follow_request',
    'follow_request_accepted',
    'new_follower',
  ])('respects opt-out for %s at delivery time', async (type) => {
    const { service, recipient, mail, prisma } = setup(type);
    recipient.emailTripNotifications = false;
    recipient.emailFollowNotifications = false;
    await service.deliverPending();
    expect(mail.sendActivityNotification).not.toHaveBeenCalled();
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'note-1' },
      data: { emailPending: false },
    });
  });

  it.each(['follow_request', 'follow_request_accepted', 'new_follower'])(
    'delivers %s with the correct connection direction',
    async (type) => {
      const { service, mail, prisma } = setup(type);
      await service.deliverPending();
      expect(mail.sendActivityNotification).toHaveBeenCalledTimes(1);
      expect(prisma.follow.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            followerId_followingId:
              type === 'follow_request_accepted'
                ? { followerId: 'recipient', followingId: 'actor' }
                : { followerId: 'actor', followingId: 'recipient' },
          },
        }),
      );
    },
  );

  it('does not send a stale request or trip membership', async () => {
    const follow = setup('follow_request');
    follow.prisma.follow.findUnique.mockResolvedValue(null);
    const trip = setup();
    trip.prisma.trip.findUnique.mockResolvedValue({
      title: 'Trip',
      members: [],
    });
    await follow.service.deliverPending();
    await trip.service.deliverPending();
    expect(follow.mail.sendActivityNotification).not.toHaveBeenCalled();
    expect(trip.mail.sendActivityNotification).not.toHaveBeenCalled();
  });

  it('requires a verified email and skips self-notifications', async () => {
    const a = setup();
    a.recipient.emailVerifiedAt = null as any;
    const b = setup();
    b.row.actorUserId = b.row.userId;
    await a.service.deliverPending();
    await b.service.deliverPending();
    expect(a.mail.sendActivityNotification).not.toHaveBeenCalled();
    expect(b.mail.sendActivityNotification).not.toHaveBeenCalled();
  });

  it('does not send if another instance already claimed the row', async () => {
    const { service, prisma, mail } = setup();
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    await service.deliverPending();
    expect(mail.sendActivityNotification).not.toHaveBeenCalled();
  });

  it('keeps a failed attempt queued for retry without throwing', async () => {
    const { service, prisma, mail } = setup();
    mail.sendActivityNotification.mockRejectedValue(
      new Error('provider unavailable'),
    );
    await expect(service.deliverPending()).resolves.toBeUndefined();
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          emailAttempts: { increment: 1 },
          emailNextAttemptAt: expect.any(Date),
        },
      }),
    );
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('does not process the queue when explicitly disabled', async () => {
    process.env.NOTIFICATION_EMAILS_ENABLED = 'false';
    const { service, prisma } = setup();
    await service.deliverPending();
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });

  it('rejects non-boolean settings and unknown fields without a database write', async () => {
    const { prisma } = setup();
    const service = new NotificationsService(prisma as any);
    for (const body of [
      { emailTripNotifications: 'false' },
      { emailFollowNotifications: 0 },
      { email: 'other@example.test' },
      {},
      null,
    ]) {
      await expect(
        service.updateEmailPreferences('recipient', body),
      ).rejects.toThrow();
    }
    expect(prisma.user.update).not.toHaveBeenCalled();
    await service.updateEmailPreferences('recipient', {
      emailTripNotifications: false,
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'recipient' },
        data: { emailTripNotifications: false },
      }),
    );
  });

  it('escapes HTML and prevents external notification links', () => {
    const result = renderActivityEmail({
      name: '<Guest>',
      title: '<b>Title</b>',
      body: 'Golf & friends',
      link: '//evil.test',
      baseUrl: 'https://stage.example.test',
    });
    expect(result.html).toContain('&lt;Guest&gt;');
    expect(result.html).toContain('Golf &amp; friends');
    expect(result.html).not.toContain('evil.test');
    expect(result.text).toContain('https://stage.example.test/notifications');
    expect(result.html).toContain('/privacy-security#email-notifications');
  });

  it('delivers removals under the trip preference without an action button', async () => {
    const { service, mail, prisma } = setup('trip_member_removed');
    await service.deliverPending();
    expect(mail.sendActivityNotification).toHaveBeenCalledWith(expect.objectContaining({ showAction: false, link: '/trips' }));
    expect(prisma.follow.findUnique).not.toHaveBeenCalled();
  });

  it('requires a valid configured frontend URL instead of using a production fallback', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.WEB_URL;
    expect(() => notificationWebUrl()).toThrow();
    process.env.FRONTEND_URL = 'javascript:alert(1)';
    expect(() => notificationWebUrl()).toThrow();
  });

  it('supports the same legacy frontend URL formats as authentication', () => {
    process.env.FRONTEND_URL = 'stage.example.test/';
    expect(notificationWebUrl()).toBe('https://stage.example.test');
    process.env.FRONTEND_URL = 'https://https://stage.example.test/';
    expect(notificationWebUrl()).toBe('https://stage.example.test');
  });
});

describe('Removal email presentation', () => {
  it('includes the logo but no trip button or trip link', () => {
    const email = renderActivityEmail({ name: 'Alex', title: 'Removed from trip', body: 'You were removed from Thailand.', link: '/trips', baseUrl: 'https://stage.example.test', showAction: false });
    expect(email.html).toContain('https://stage.example.test/logo.png');
    expect(email.html).not.toContain('Open Fairwayd');
    expect(email.text).not.toContain('Open Fairwayd');
    expect(email.html).toContain('Manage email notifications');
  });
});
