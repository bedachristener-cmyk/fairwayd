import { copyLegacyTripDocumentToPrivate, readStoredUpload, uploadPrivateToR2, uploadToR2 } from './r2.service';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

jest.mock('@aws-sdk/client-s3', () => {
  return {
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
  };
});

const ORIGINAL_ENV = process.env;

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NODE_ENV;
  delete process.env.NEON_DATABASE_URL;
  delete process.env.FAIRWAYD_REQUIRE_DURABLE_UPLOADS;
  delete process.env.R2_ENDPOINT;
  delete process.env.R2_BUCKET;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
  delete process.env.R2_PUBLIC_URL;
  delete process.env.R2_PUBLIC_BASE_URL;
  delete process.env.R2_PRIVATE_DOCUMENT_BUCKET;
  delete process.env.R2_LEGACY_PUBLIC_BASE_URL;
  delete process.env.R2_ALLOW_LEGACY_SHARED_TRIP_DOCUMENT_READS;
}

function mockS3Send(send: jest.Mock) {
  (S3Client as jest.Mock).mockImplementation(() => ({
    send,
  }));
}

describe('uploadToR2 durable storage guard', () => {
  beforeEach(() => {
    resetEnv();
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetEnv();
    rmSync(join(process.cwd(), 'uploads', 'posts', 'test-local.jpg'), {
      force: true,
    });
  });

  it('returns the durable public URL when R2 upload succeeds', async () => {
    const send = jest.fn().mockResolvedValue({});
    mockS3Send(send);
    process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.R2_BUCKET = 'fairwayd-stage';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
    process.env.NEON_DATABASE_URL = 'postgresql://shared-db';

    await expect(
      uploadToR2('posts/test.jpg', Buffer.from('image'), 'image/jpeg'),
    ).resolves.toBe('https://cdn.example.com/posts/test.jpg');

    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0][0] as any).input.Bucket).toBe('fairwayd-stage');
  });

  it('keeps private uploads addressable without exposing the public URL', async () => {
    const send = jest.fn().mockResolvedValue({});
    mockS3Send(send);
    process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.R2_BUCKET = 'public-media';
    process.env.R2_PRIVATE_DOCUMENT_BUCKET = 'fairwayd-trip-documents-stage';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
    process.env.NEON_DATABASE_URL = 'postgresql://shared-db';

    await expect(
      uploadPrivateToR2(
        'private-trip-documents/trips/trip-1/documents/private.pdf',
        Buffer.from('private'),
        'application/pdf',
      ),
    ).resolves.toBe('r2://private-trip-documents/trips/trip-1/documents/private.pdf');

    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0][0] as any).input.Bucket).toBe('fairwayd-trip-documents-stage');
  });

  it('reads private R2 uploads through authenticated object storage', async () => {
    const send = jest.fn().mockResolvedValue({
      Body: {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array(Buffer.from('private'))),
      },
    });
    mockS3Send(send);
    process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.R2_BUCKET = 'fairwayd-stage';
    process.env.R2_PRIVATE_DOCUMENT_BUCKET = 'fairwayd-trip-documents-stage';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';

    await expect(
      readStoredUpload('r2://private-trip-documents/trips/trip-1/documents/private.pdf'),
    ).resolves.toEqual(Buffer.from('private'));

    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0][0] as any).input.Bucket).toBe('fairwayd-trip-documents-stage');
  });

  it('fails closed for Trip uploads when the private bucket is missing', async () => {
    process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.R2_BUCKET = 'public-media';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';

    await expect(uploadPrivateToR2('trips/t/documents/x.pdf', Buffer.from('x'), 'application/pdf'))
      .rejects.toThrow('Private Trip document storage is not configured');
    expect(S3Client).not.toHaveBeenCalled();
  });

  it('copies a legacy object into private storage and verifies bytes before returning a private reference', async () => {
    const content = Buffer.from('legacy-private-content');
    const send = jest.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({
      Body: { transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array(content)) },
    });
    mockS3Send(send);
    process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.R2_PRIVATE_DOCUMENT_BUCKET = 'private-docs';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_PUBLIC_BASE_URL = 'https://pub.example.r2.dev';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => content,
    } as Response);

    await expect(copyLegacyTripDocumentToPrivate('https://pub.example.r2.dev/trips/a.pdf', 'private-trip-documents/trips/t/documents/id/legacy.pdf', 'application/pdf'))
      .resolves.toBe('r2://private-trip-documents/trips/t/documents/id/legacy.pdf');
    expect(send).toHaveBeenCalledTimes(2);
    expect((send.mock.calls[0][0] as any).input.Bucket).toBe('private-docs');
    expect((send.mock.calls[1][0] as any).input.Bucket).toBe('private-docs');
    expect(PutObjectCommand).toHaveBeenCalled();
    expect(GetObjectCommand).toHaveBeenCalled();
  });

  it('rejects unconfigured legacy hosts before making an outbound request', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    process.env.R2_PUBLIC_BASE_URL = 'https://pub.example.r2.dev';
    await expect(readStoredUpload('https://attacker.example/private.pdf'))
      .rejects.toThrow('outside the configured public media origin');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reads old shared-bucket r2 references only when the explicit migration compatibility flag is enabled', async () => {
    const send = jest.fn().mockResolvedValue({ Body: { transformToByteArray: async () => Buffer.from('legacy') } });
    mockS3Send(send);
    process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.R2_BUCKET = 'public-media';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';

    await expect(readStoredUpload('r2://trips/old.pdf')).rejects.toThrow('Invalid private Trip document reference');
    process.env.R2_ALLOW_LEGACY_SHARED_TRIP_DOCUMENT_READS = 'true';
    await expect(readStoredUpload('r2://trips/old.pdf')).resolves.toEqual(Buffer.from('legacy'));
    expect((send.mock.calls[0][0] as any).input.Bucket).toBe('public-media');
  });

  it('fails instead of returning /uploads when shared data has missing R2 config', async () => {
    process.env.NEON_DATABASE_URL = 'postgresql://shared-db';

    await expect(
      uploadToR2('posts/test.jpg', Buffer.from('image'), 'image/jpeg'),
    ).rejects.toThrow('R2 storage is not configured');

    expect(S3Client).not.toHaveBeenCalled();
  });

  it('fails instead of falling back locally when shared data R2 upload fails', async () => {
    const send = jest.fn().mockRejectedValue(new Error('R2 unavailable'));
    mockS3Send(send);
    process.env.NEON_DATABASE_URL = 'postgresql://shared-db';
    process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.R2_BUCKET = 'fairwayd-stage';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';

    await expect(
      uploadToR2('posts/test.jpg', Buffer.from('image'), 'image/jpeg'),
    ).rejects.toThrow('R2 unavailable');

    expect(
      existsSync(join(process.cwd(), 'uploads', 'posts', 'test.jpg')),
    ).toBe(false);
  });

  it('keeps local upload fallback for isolated local development', async () => {
    await expect(
      uploadToR2('posts/test-local.jpg', Buffer.from('image'), 'image/jpeg'),
    ).resolves.toBe('/uploads/posts/test-local.jpg');

    expect(
      existsSync(join(process.cwd(), 'uploads', 'posts', 'test-local.jpg')),
    ).toBe(true);
  });
});
