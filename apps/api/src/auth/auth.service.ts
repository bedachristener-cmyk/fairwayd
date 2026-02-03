import {
  BadRequestException,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

type OAuthProvider = 'GOOGLE' | 'APPLE' | 'FACEBOOK';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // =========================================================
  // Public API
  // =========================================================

  async loginWithOAuth(params: {
    provider: OAuthProvider;
    idToken?: string;
    accessToken?: string;
  }) {
    const { provider } = params;

    if (provider === 'GOOGLE') {
      if (!params.idToken) {
        throw new BadRequestException('Missing idToken');
      }
      const profile = await this.verifyGoogleIdToken(params.idToken);
      return this.issueTokenForProfile('GOOGLE', profile);
    }

    if (provider === 'APPLE') {
      if (!params.idToken) {
        throw new BadRequestException('Missing idToken');
      }
      const profile = await this.verifyAppleIdToken(params.idToken);
      return this.issueTokenForProfile('APPLE', profile);
    }

    if (provider === 'FACEBOOK') {
      throw new BadRequestException('Facebook login not implemented yet');
    }

    throw new BadRequestException('Unknown provider');
  }

  async devLogin(handle: string) {
    const safeHandle =
      handle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .slice(0, 20) || 'dev_user';

    let user = await this.prisma.user.findUnique({
      where: { handle: safeHandle },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          handle: safeHandle,
          name: safeHandle,
          email: null,
          password: null,
          avatarUrl: null,
          termsAcceptedAt: null,
          termsVersion: null,
        },
      });
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
    });

    return {
      token,
      user: {
        id: user.id,
        handle: user.handle,
        name: user.name,
        avatarUrl: user.avatarUrl,
        termsAcceptedAt: (user as any).termsAcceptedAt ?? null,
        termsVersion: (user as any).termsVersion ?? null,
      },
    };
  }

  // =========================================================
  // Core OAuth logic
  // =========================================================

  private async issueTokenForProfile(
    provider: OAuthProvider,
    profile: {
      providerUserId: string;
      email?: string | null;
      name?: string | null;
      avatarUrl?: string | null;
    },
  ) {
    const providerUserId = profile.providerUserId;
    if (!providerUserId) {
      throw new BadRequestException('Missing provider user id');
    }

    const existing = await this.prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      include: { user: true },
    });

    let user = existing?.user;

    try {
      // First login: create user WITHOUT handle
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: profile.email ?? null,
            password: null,
            handle: null, // <- handle comes later via ProfileSetup
            name: profile.name ?? null,
            avatarUrl: profile.avatarUrl ?? null,
            termsAcceptedAt: null,
            termsVersion: null,
            accounts: {
              create: {
                provider,
                providerUserId,
                email: profile.email ?? null,
              },
            },
          },
        });
      } else {
        // Keep minimal profile data in sync
        const patch: any = {};
        if (!user.email && profile.email) patch.email = profile.email;
        if (!user.name && profile.name) patch.name = profile.name;
        if (!user.avatarUrl && profile.avatarUrl) {
          patch.avatarUrl = profile.avatarUrl;
        }

        if (Object.keys(patch).length > 0) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: patch,
          });
        }
      }
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Unique constraint conflict');
      }
      throw e;
    }

    const token = await this.jwt.signAsync({
      sub: user.id,
    });

    return {
      token,
      user: {
        id: user.id,
        handle: user.handle, // string | null
        name: user.name,
        avatarUrl: user.avatarUrl,
        termsAcceptedAt: (user as any).termsAcceptedAt ?? null,
        termsVersion: (user as any).termsVersion ?? null,
      },
    };
  }

  // =========================================================
  // Provider verification
  // =========================================================

  private async verifyGoogleIdToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw new Error('Missing sub');
      }

      return {
        providerUserId: payload.sub,
        email: payload.email ?? null,
        name: payload.name ?? null,
        avatarUrl: payload.picture ?? null,
      };
    } catch {
      throw new BadRequestException('Invalid Google token');
    }
  }

  private async verifyAppleIdToken(idToken: string) {
    const jwks = createRemoteJWKSet(
      new URL('https://appleid.apple.com/auth/keys'),
    );

    const { payload } = await jwtVerify(idToken, jwks, {
      audience: process.env.APPLE_CLIENT_ID,
      issuer: 'https://appleid.apple.com',
    });

    if (!payload.sub) {
      throw new BadRequestException('Invalid Apple token');
    }

    return {
      providerUserId: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email : null,
      name: null,
      avatarUrl: null,
    };
  }
}
