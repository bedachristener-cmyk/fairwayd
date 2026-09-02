import { uploadToR2 } from './r2.service';
import { S3Client } from '@aws-sdk/client-s3';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

jest.mock('@aws-sdk/client-s3', () => {
  return {
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

    expect(existsSync(join(process.cwd(), 'uploads', 'posts', 'test.jpg'))).toBe(
      false,
    );
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
