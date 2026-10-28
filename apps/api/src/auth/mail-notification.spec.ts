import { MailService } from './mail.service';

const send = jest.fn();
jest.mock('resend', () => ({
  Resend: jest
    .fn()
    .mockImplementation(() => ({
      emails: { send: (...args: unknown[]) => send(...args) },
    })),
}));

describe('Activity email delivery', () => {
  const env = { ...process.env };
  const input = {
    email: 'recipient@example.test',
    name: 'A <golfer>',
    title: 'Added to trip',
    body: 'Golf & travel',
    link: '/trips/trip-1',
    baseUrl: 'https://stage.example.test',
    notificationId: 'note-1',
  };
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'fake-test-key';
    process.env.EMAIL_FROM = 'Fairwayd <mail@example.test>';
    send.mockReset();
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it('uses the configured sender, plain text fallback and a stable idempotency key', async () => {
    send.mockResolvedValue({ data: { id: 'mail-id' }, error: null });
    await expect(
      new MailService().sendActivityNotification(input),
    ).resolves.toBe('mail-id');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Fairwayd <mail@example.test>',
        to: input.email,
        html: expect.stringContaining('A &lt;golfer&gt;'),
        text: expect.stringContaining(
          'https://stage.example.test/trips/trip-1',
        ),
      }),
      { idempotencyKey: 'notification/note-1' },
    );
  });

  it('rejects provider errors so the queue can retry', async () => {
    send.mockResolvedValue({ error: { message: 'rate limited' }, data: null });
    await expect(
      new MailService().sendActivityNotification(input),
    ).rejects.toThrow('delivery failed');
  });

  it('never pretends to send when credentials are missing', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      new MailService().sendActivityNotification(input),
    ).rejects.toThrow('not configured');
    expect(send).not.toHaveBeenCalled();
  });
});
