import { ForbiddenException } from '@nestjs/common';
import { AuthService, isDevLoginEnabled } from './auth.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

const ORIGINAL_ENV = process.env;

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NODE_ENV;
  delete process.env.NEON_DATABASE_URL;
  delete process.env.FAIRWAYD_REQUIRE_DURABLE_UPLOADS;
  delete process.env.FAIRWAYD_ENABLE_DEV_LOGIN;
}

function createService() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    passwordResetCode: {
      updateMany: jest.fn(),
    },
  };
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  };
  const mail = {};

  return {
    prisma,
    jwt,
    service: new AuthService(prisma as any, jwt as any, mail as any),
  };
}

describe('AuthService dev login guard', () => {
  beforeEach(() => {
    resetEnv();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetEnv();
  });

  it('allows dev login in isolated local development', async () => {
    process.env.NODE_ENV = 'development';
    const { prisma, jwt, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'dev-user-1',
      handle: 'beda',
      name: 'Beda',
      avatarUrl: null,
      termsAcceptedAt: null,
      termsVersion: null,
    });

    await expect(service.devLogin('beda')).resolves.toEqual({
      token: 'signed-token',
      user: expect.objectContaining({
        id: 'dev-user-1',
        handle: 'beda',
      }),
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { handle: 'beda' },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'dev-user-1' });
  });

  it('always rejects dev login in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FAIRWAYD_ENABLE_DEV_LOGIN = 'true';
    const { prisma, jwt, service } = createService();

    await expect(service.devLogin('beda')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects dev login by default for shared Neon data', async () => {
    process.env.NODE_ENV = 'development';
    process.env.NEON_DATABASE_URL = 'postgresql://shared-stage';
    const { prisma, jwt, service } = createService();

    await expect(service.devLogin('beda')).rejects.toThrow(
      'Dev login is disabled',
    );

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('reports disabled when durable shared uploads are required', () => {
    process.env.NODE_ENV = 'test';
    process.env.FAIRWAYD_REQUIRE_DURABLE_UPLOADS = 'true';

    expect(isDevLoginEnabled()).toBe(false);
  });
});


describe('AuthService password setup', () => {
  beforeEach(() => {
    resetEnv();
    jest.clearAllMocks();
  });

  it('sends a reset code even when an OAuth account has no password yet', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'google-user-1',
      email: 'golfer@example.com',
      name: 'Golfer',
      password: null,
    });
    const sendCode = jest
      .spyOn(service as any, 'createAndSendPasswordResetCode')
      .mockResolvedValue(undefined);

    await expect(
      service.forgotPassword('golfer@example.com'),
    ).resolves.toEqual({
      message: 'If an account exists for this email, we sent a reset code.',
    });

    expect(prisma.passwordResetCode.updateMany).toHaveBeenCalled();
    expect(sendCode).toHaveBeenCalledWith(
      'google-user-1',
      'golfer@example.com',
      'Golfer',
    );
  });
});
