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
import type { Response } from 'express';
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

  @Post('email/request')
  async requestEmailLogin(@Body() body: { email?: string }) {
    const email = body?.email;
    if (!email) throw new BadRequestException('Missing email');
    return this.auth.requestEmailLogin(email);
  }

  @Post('email/verify')
  async verifyEmailLogin(@Body() body: { token?: string }) {
    const token = body?.token;
    if (!token) throw new BadRequestException('Missing token');
    return this.auth.verifyEmailLogin(token);
  }

  /**
   * Dev-only login (local/dev environments)
   */
  @Post('dev')
  async dev(@Body() body: { handle?: string }) {
    const handle = body?.handle?.trim();
    if (!handle) throw new BadRequestException('Missing handle');
    return this.auth.devLogin(handle);
  }
}
