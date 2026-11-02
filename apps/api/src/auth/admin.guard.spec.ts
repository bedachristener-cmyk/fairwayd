import { ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

const ORIGINAL_ENV = process.env;

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.FAIRWAYD_ADMIN_USER_IDS;
  delete process.env.FAIRWAYD_ADMIN_HANDLES;
}

function contextForUser(user: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as any;
}

describe('AdminGuard', () => {
  const findUnique = jest.fn();
  const prisma = { user: { findUnique } } as any;

  beforeEach(() => {
    resetEnv();
    findUnique.mockReset();
  });

  afterEach(() => {
    resetEnv();
  });

  it('denies authenticated normal users by default', async () => {
    findUnique.mockResolvedValue({ id: 'user-1', handle: 'normal', adminRole: null });
    const guard = new AdminGuard(prisma);
    await expect(guard.canActivate(contextForUser({ userId: 'user-1' })))
      .rejects.toThrow(ForbiddenException);
  });

  it('allows users with the ADMIN database role', async () => {
    findUnique.mockResolvedValue({ id: 'admin-1', handle: 'normal', adminRole: 'ADMIN' });
    const guard = new AdminGuard(prisma);
    await expect(guard.canActivate(contextForUser({ userId: 'admin-1' })))
      .resolves.toBe(true);
  });

  it('allows legacy admin ids when the database role is null', async () => {
    process.env.FAIRWAYD_ADMIN_USER_IDS = 'admin-user-1';
    findUnique.mockResolvedValue({ id: 'admin-user-1', handle: 'normal', adminRole: null });
    const guard = new AdminGuard(prisma);
    await expect(guard.canActivate(contextForUser({ userId: 'admin-user-1' })))
      .resolves.toBe(true);
  });

  it('allows legacy admin handles when the database role is null', async () => {
    process.env.FAIRWAYD_ADMIN_HANDLES = 'beda';
    findUnique.mockResolvedValue({ id: 'user-1', handle: 'Beda', adminRole: null });
    const guard = new AdminGuard(prisma);
    await expect(guard.canActivate(contextForUser({ userId: 'user-1' })))
      .resolves.toBe(true);
  });

  it('does not let a legacy allowlist override an explicit non-admin role', async () => {
    process.env.FAIRWAYD_ADMIN_HANDLES = 'beda';
    findUnique.mockResolvedValue({ id: 'user-1', handle: 'beda', adminRole: 'USER' });
    const guard = new AdminGuard(prisma);
    await expect(guard.canActivate(contextForUser({ userId: 'user-1' })))
      .rejects.toThrow(ForbiddenException);
  });

  it('denies unknown users', async () => {
    findUnique.mockResolvedValue(null);
    const guard = new AdminGuard(prisma);
    await expect(guard.canActivate(contextForUser({ userId: 'missing' })))
      .rejects.toThrow(ForbiddenException);
  });
});
