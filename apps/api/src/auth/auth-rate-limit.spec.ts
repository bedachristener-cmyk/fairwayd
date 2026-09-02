import { CanActivate, Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AUTH_RATE_LIMITS } from './auth-rate-limits';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

class AllowGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

@Controller('private-test')
class PrivateTestController {
  @Get()
  getPrivate() {
    return { ok: true };
  }
}

function createAuthServiceMock() {
  return {
    loginWithOAuth: jest.fn(),
    getGoogleNativeRedirectUri: jest.fn(),
    loginWithGoogleAuthorizationCode: jest.fn(),
    requestEmailLogin: jest.fn(),
    verifyEmailLogin: jest.fn(),
    loginWithPassword: jest.fn().mockResolvedValue({ token: 'token' }),
    registerWithPassword: jest.fn(),
    verifyEmailCode: jest.fn(),
    resendEmailVerificationCode: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    setPassword: jest.fn(),
    devLogin: jest.fn(),
  };
}

describe('Auth route rate limiting', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
      controllers: [AuthController, PrivateTestController],
      providers: [
        {
          provide: AuthService,
          useValue: createAuthServiceMock(),
        },
        AllowGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows password login requests below the route limit', async () => {
    for (let i = 0; i < AUTH_RATE_LIMITS.login.limit; i++) {
      await request(app.getHttpServer())
        .post('/auth/password-login')
        .send({ email: 'user@example.com', password: 'password123' })
        .expect(201);
    }
  });

  it('returns 429 after the password login route limit is exceeded', async () => {
    for (let i = 0; i < AUTH_RATE_LIMITS.login.limit; i++) {
      await request(app.getHttpServer())
        .post('/auth/password-login')
        .send({ email: 'user@example.com', password: 'password123' })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/auth/password-login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(429);
  });

  it('does not globally throttle unrelated endpoints', async () => {
    for (let i = 0; i < AUTH_RATE_LIMITS.login.limit + 1; i++) {
      await request(app.getHttpServer()).get('/private-test').expect(200);
    }
  });
});
