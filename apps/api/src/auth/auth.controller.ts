import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
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
