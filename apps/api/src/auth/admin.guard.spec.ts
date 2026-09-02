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
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it('denies authenticated normal users by default', () => {
    const guard = new AdminGuard();

    expect(() =>
      guard.canActivate(
        contextForUser({ userId: 'user-1', handle: 'normal' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows users whose id is configured as admin', () => {
    process.env.FAIRWAYD_ADMIN_USER_IDS = 'admin-user-1';
    const guard = new AdminGuard();

    expect(
      guard.canActivate(
        contextForUser({ userId: 'admin-user-1', handle: 'normal' }),
      ),
    ).toBe(true);
  });

  it('allows users whose handle is configured as admin', () => {
    process.env.FAIRWAYD_ADMIN_HANDLES = 'beda';
    const guard = new AdminGuard();

    expect(
      guard.canActivate(contextForUser({ userId: 'user-1', handle: 'Beda' })),
    ).toBe(true);
  });
});
