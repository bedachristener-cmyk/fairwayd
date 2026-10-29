import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  Res,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AUTH_RATE_LIMITS } from './auth-rate-limits';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

export type OAuthProvider = 'GOOGLE' | 'APPLE' | 'FACEBOOK';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Return current user from JWT
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }

  /**
   * Generic OAuth endpoint
   * - GOOGLE: expects idToken
   * - APPLE:  expects idToken (later)
   * - FACEBOOK: expects accessToken (later)
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.login })
  @Post('oauth')
  async oauth(
    @Body()
    body: {
      provider: OAuthProvider;
      idToken?: string; // Google / Apple
      accessToken?: string; // Facebook (later)
    },
  ) {
    if (!body?.provider) {
      throw new BadRequestException('Missing OAuth provider');
    }

    // Normalize provider casing (defensive)
    const provider = String(body.provider).toUpperCase() as OAuthProvider;

    return this.auth.loginWithOAuth({
      provider,
      idToken: body.idToken,
      accessToken: body.accessToken,
    });
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.login })
  @Get('google/native/start')
  startGoogleNative(@Res() res: Response) {
    const clientId = String(process.env.GOOGLE_CLIENT_ID ?? '').trim();
    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not set');
    }

    const redirectUri = this.auth.getGoogleNativeRedirectUri();

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('access_type', 'offline');

    return res.redirect(url.toString());
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.login })
  @Get('google/native/callback')
  async googleNativeCallback(
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      const target = `fairwayd://auth/native-callback?error=${encodeURIComponent(error)}`;
      return res.redirect(target);
    }

    if (!code) {
      const target = `fairwayd://auth/native-callback?error=${encodeURIComponent(
        'Missing Google authorization code',
      )}`;
      return res.redirect(target);
    }

    try {
      const result = await this.auth.loginWithGoogleAuthorizationCode(code);
      const token = result?.token;

      if (!token) {
        throw new Error('Backend returned no token');
      }

      const target = `fairwayd://auth/native-callback?token=${encodeURIComponent(
        token,
      )}`;
      return res.redirect(target);
    } catch (e: any) {
      const message = e?.message ?? 'Google native login failed';
      const target = `fairwayd://auth/native-callback?error=${encodeURIComponent(
        message,
      )}`;
      return res.redirect(target);
    }
  }

  /**
   * Backwards compatibility for older frontends / cached bundles
   * Accepts POST /auth/google with either:
   * - { credential: string }  (Google Identity Services)
   * - { idToken: string }
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.login })
  @Post('google')
  async google(@Body() body: { credential?: string; idToken?: string }) {
    const idToken = body?.idToken ?? body?.credential;

    if (!idToken) {
      throw new BadRequestException('Missing Google idToken');
    }

    return this.auth.loginWithOAuth({
      provider: 'GOOGLE',
      idToken,
    });
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.emailSend })
  @Post('email/request')
  async requestEmailLogin(@Body() body: { email?: string }) {
    const email = body?.email;
    if (!email) throw new BadRequestException('Missing email');
    return this.auth.requestEmailLogin(email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.verify })
  @Post('email/verify')
  async verifyEmailLogin(@Body() body: { token?: string }) {
    const token = body?.token;
    if (!token) throw new BadRequestException('Missing token');
    return this.auth.verifyEmailLogin(token);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.login })
  @Post('password-login')
  async passwordLogin(@Body() body: { email?: string; password?: string }) {
    const email = body?.email;
    const password = body?.password;
    if (!email || !password) {
      throw new BadRequestException('Missing email or password');
    }

    return this.auth.loginWithPassword(email, password);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.register })
  @Post('register')
  async register(
    @Body()
    body: {
      name?: string;
      email?: string;
      password?: string;
      passwordConfirm?: string;
      acceptedTerms?: boolean;
      acceptedPrivacy?: boolean;
    },
  ) {
    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const passwordConfirm = String(body?.passwordConfirm ?? '');

    console.log('[Auth] register attempt', { email });

    try {
      if (name.length < 2) {
        throw new BadRequestException('Name must be at least 2 characters');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('Invalid email');
      }
      if (password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters');
      }
      if (password !== passwordConfirm) {
        throw new BadRequestException('Passwords do not match');
      }
      if (body?.acceptedTerms !== true || body?.acceptedPrivacy !== true) {
        throw new BadRequestException(
          'Terms and Privacy Policy must be accepted',
        );
      }

      const result = await this.auth.registerWithPassword({
        name,
        email,
        password,
        passwordConfirm,
        acceptedTerms: body.acceptedTerms,
        acceptedPrivacy: body.acceptedPrivacy,
      });

      console.log('[Auth] register success', {
        email,
      });

      return result;
    } catch (e: any) {
      console.log('[Auth] register failed', {
        message: e?.message ?? String(e),
      });
      throw e;
    }
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.verify })
  @Post('verify-email')
  async verifyEmail(@Body() body: { email?: string; code?: string }) {
    const email = body?.email;
    const code = body?.code;

    if (!email || !code) {
      throw new BadRequestException('Missing email or code');
    }

    return this.auth.verifyEmailCode(email, code);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.emailSend })
  @Post('resend-verification-code')
  async resendVerificationCode(@Body() body: { email?: string }) {
    const email = body?.email;
    if (!email) throw new BadRequestException('Missing email');
    return this.auth.resendEmailVerificationCode(email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.emailSend })
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email?: string }) {
    const email = body?.email;
    if (!email) throw new BadRequestException('Missing email');
    return this.auth.forgotPassword(email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.verify })
  @Post('reset-password')
  async resetPassword(
    @Body()
    body: {
      email?: string;
      code?: string;
      newPassword?: string;
    },
  ) {
    const email = body?.email;
    const code = body?.code;
    const newPassword = body?.newPassword;

    if (!email || !code || !newPassword) {
      throw new BadRequestException('Missing email, code or new password');
    }

    return this.auth.resetPassword(email, code, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    const userId = req?.user?.userId ?? req?.user?.id ?? req?.user?.sub;
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;

    if (!userId) throw new BadRequestException('Missing user id');
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Missing current or new password');
    }

    return this.auth.changePassword(userId, currentPassword, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-password')
  async setPassword(@Req() req: any, @Body() body: { password?: string }) {
    const userId = req?.user?.userId ?? req?.user?.id ?? req?.user?.sub;
    const password = body?.password;

    if (!userId) throw new BadRequestException('Missing user id');
    if (!password) throw new BadRequestException('Missing password');

    return this.auth.setPassword(userId, password);
  }

  /**
   * Dev-only login (local/dev environments)
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_RATE_LIMITS.dev })
  @Post('dev')
  async dev(@Body() body: { handle?: string }) {
    const handle = body?.handle?.trim();
    if (!handle) throw new BadRequestException('Missing handle');
    return this.auth.devLogin(handle);
  }
}
