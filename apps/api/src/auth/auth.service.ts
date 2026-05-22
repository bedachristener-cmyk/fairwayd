import {
  BadRequestException,
  Injectable,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { MailService } from './mail.service';

type OAuthProvider = 'GOOGLE' | 'APPLE' | 'FACEBOOK';

const MIN_HANDLE_LENGTH = 3;

function safePrefix(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized ? `${normalized.slice(0, 12)}...` : null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    for (const item of String(value ?? '').split(',')) {
      const normalized = item.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

function decodeGoogleTokenAudience(idToken: string) {
  try {
    const [, payloadPart] = idToken.split('.');
    if (!payloadPart) return null;

    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    );
    const aud = payload?.aud;

    return {
      audPrefixes: Array.isArray(aud)
        ? aud.map((item) => safePrefix(String(item)))
        : [safePrefix(typeof aud === 'string' ? aud : null)].filter(Boolean),
      azpPrefix: safePrefix(typeof payload?.azp === 'string' ? payload.azp : null),
    };
  } catch {
    return null;
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  // Keep one google client instance (less overhead)
  private readonly googleClient = new OAuth2Client();

  // =========================================================
  // Public API
  // =========================================================

  async loginWithOAuth(params: {
    provider: OAuthProvider;
    idToken?: string;
    accessToken?: string;
  }) {
    const provider = (params.provider ?? '').toUpperCase() as OAuthProvider;

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

  async loginWithGoogleAuthorizationCode(codeInput: string) {
    const code = String(codeInput ?? '').trim();
    if (!code) {
      throw new BadRequestException('Missing Google authorization code');
    }

    const clientId = this.getGoogleClientId();
    const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET ?? '').trim();
    const redirectUri = this.getGoogleNativeRedirectUri();

    if (!clientSecret) {
      throw new BadRequestException('GOOGLE_CLIENT_SECRET is not set');
    }

    const client = new OAuth2Client(clientId, clientSecret, redirectUri);

    try {
      const { tokens } = await client.getToken(code);

      if (!tokens.id_token) {
        throw new Error('Google returned no id_token');
      }

      return this.loginWithOAuth({
        provider: 'GOOGLE',
        idToken: tokens.id_token,
      });
    } catch (e: any) {
      console.error('[OAuth] Google authorization code exchange failed', {
        message: e?.message ?? String(e),
        name: e?.name,
        code: e?.code,
        node: process.version,
      });

      throw new BadRequestException(
        'Google authorization code exchange failed',
      );
    }
  }

  async devLogin(handle: string) {
    const safeHandle =
      handle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .slice(0, 20) || 'dev_user';

    if (safeHandle.length < MIN_HANDLE_LENGTH) {
      throw new BadRequestException('Handle must be at least 3 characters');
    }

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

  async requestEmailLogin(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashMagicToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.emailLoginToken.create({
      data: {
        email,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = this.getFrontendUrl();
    const link = `${frontendUrl}/auth/email/callback?token=${encodeURIComponent(rawToken)}`;

    let delivery: Awaited<ReturnType<MailService['sendMagicLink']>>;

    try {
      delivery = await this.mail.sendMagicLink(email, link);
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : String(err);

      console.error('Mail send failed', {
        message: safeDetail,
      });

      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Could not send login link. Please try again later.',
        );
      }

      throw new ServiceUnavailableException({
        message: 'Could not send login link',
        detail: safeDetail,
      });
    }

    return { ok: true, delivery: delivery.mode };
  }

  async verifyEmailLogin(rawToken: string) {
    const token = String(rawToken ?? '').trim();
    if (!token) throw new BadRequestException('Missing token');

    const tokenHash = this.hashMagicToken(token);
    const row = await this.prisma.emailLoginToken.findUnique({
      where: { tokenHash },
    });

    if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Invalid or expired login link');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.emailLoginToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });

      const existing = await tx.user.findUnique({
        where: { email: row.email },
      });

      if (existing) return existing;

      return tx.user.create({
        data: {
          email: row.email,
          password: null,
          handle: await this.generateEmailHandle(row.email, tx),
          name: null,
          avatarUrl: null,
          termsAcceptedAt: null,
          termsVersion: null,
        },
      });
    });

    return this.issueJwtResponse(user);
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
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: profile.email ?? null,
            password: null,
            handle: null,
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
        const patch: any = {};
        if (!user.email && profile.email) patch.email = profile.email;
        if (!user.name && profile.name) patch.name = profile.name;
        if (!user.avatarUrl && profile.avatarUrl)
          patch.avatarUrl = profile.avatarUrl;

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

    return this.issueJwtResponse(user);
  }

  private async issueJwtResponse(user: {
    id: string;
    handle?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    termsAcceptedAt?: Date | null;
    termsVersion?: string | null;
  }) {
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
        termsAcceptedAt: user.termsAcceptedAt ?? null,
        termsVersion: user.termsVersion ?? null,
      },
    };
  }

  private normalizeEmail(emailInput: string) {
    const email = String(emailInput ?? '')
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email');
    }
    return email;
  }

  private hashMagicToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  getGoogleNativeRedirectUri() {
    return String(
      process.env.GOOGLE_NATIVE_REDIRECT_URI ||
        `${this.getApiBaseUrl()}/auth/google/native/callback`,
    )
      .trim()
      .replace(/\/+$/, '');
  }

  getApiBaseUrl() {
    return String(
      process.env.API_PUBLIC_URL ||
        process.env.API_BASE_URL ||
        'http://localhost:3000',
    )
      .trim()
      .replace(/^https?:\/\/https?:\/\//i, 'https://')
      .replace(/\/+$/, '')
      .replace(/^(?!https?:\/\/)/i, 'https://');
  }

  private getFrontendUrl() {
    const raw = String(
      process.env.FRONTEND_URL ||
        process.env.WEB_URL ||
        'http://localhost:5173',
    ).trim();

    return raw
      .replace(/^https?:\/\/https?:\/\//i, 'https://')
      .replace(/\/+$/, '')
      .replace(/^(?!https?:\/\/)/i, 'https://');
  }

  private async generateEmailHandle(
    email: string,
    tx: Prisma.TransactionClient,
  ) {
    const prefix =
      email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 14) || 'golfer';

    for (let i = 0; i < 8; i += 1) {
      const suffix = randomBytes(3).toString('hex');
      const handle = `${prefix}_${suffix}`.slice(0, 20);
      const existing = await tx.user.findUnique({ where: { handle } });
      if (!existing) return handle;
    }

    return `golfer_${randomBytes(6).toString('hex')}`.slice(0, 20);
  }

  // =========================================================
  // Provider verification
  // =========================================================

  private isDebugEnabled() {
    return String(process.env.OAUTH_DEBUG ?? 'false').toLowerCase() === 'true';
  }

  private getGoogleClientId(): string {
    const clientId = String(process.env.GOOGLE_CLIENT_ID ?? '').trim();
    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not set');
    }
    return clientId;
  }

  private getGoogleClientAudiences(): string[] {
    const audiences = uniqueStrings([
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_IDS,
      process.env.GOOGLE_WEB_CLIENT_ID,
      process.env.GOOGLE_NATIVE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ]);

    if (audiences.length === 0) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not set');
    }

    return audiences;
  }

  private async verifyGoogleIdToken(idToken: string) {
    const audiences = this.getGoogleClientAudiences();
    const decodedAudience = decodeGoogleTokenAudience(idToken);

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      });

      const payload = ticket.getPayload();

      if (!payload?.sub) {
        throw new Error('Missing sub');
      }

      // Robust audience check (some libs/versions can vary)
      const audAny: any = (payload as any).aud;
      const audOk =
        typeof audAny === 'string'
          ? audiences.includes(audAny)
          : Array.isArray(audAny)
            ? audAny.some((aud) => audiences.includes(aud))
            : false;

      if (!audOk) {
        throw new Error(
          `Audience mismatch audPrefix=${JSON.stringify(
            decodedAudience?.audPrefixes ?? [],
          )} expectedPrefixes=${JSON.stringify(audiences.map(safePrefix))}`,
        );
      }

      if (this.isDebugEnabled()) {
        console.log('[OAuth] Google verify OK', {
          email: payload.email ?? null,
          audPrefixes: decodedAudience?.audPrefixes ?? [],
          azpPrefix: decodedAudience?.azpPrefix ?? null,
          expectedAudPrefixes: audiences.map(safePrefix),
          node: process.version,
        });
      }

      return {
        providerUserId: payload.sub,
        email: payload.email ?? null,
        name: payload.name ?? null,
        avatarUrl: payload.picture ?? null,
      };
    } catch (e: any) {
      // Always log real error to Railway logs (no token)
      console.error('[OAuth] Google verifyIdToken failed', {
        message: e?.message ?? String(e),
        name: e?.name,
        code: e?.code,
        tokenAudPrefixes: decodedAudience?.audPrefixes ?? [],
        tokenAzpPrefix: decodedAudience?.azpPrefix ?? null,
        expectedAudPrefixes: audiences.map(safePrefix),
        node: process.version,
      });

      if (this.isDebugEnabled()) {
        throw new BadRequestException(
          `Invalid Google token ${e?.message ?? String(e)}`,
        );
      }

      throw new BadRequestException('Invalid Google token');
    }
  }

  private async verifyAppleIdToken(idToken: string) {
    const appleAudience = process.env.APPLE_CLIENT_ID
      ? String(process.env.APPLE_CLIENT_ID).trim()
      : undefined;

    if (!appleAudience) {
      throw new BadRequestException('APPLE_CLIENT_ID is not set');
    }

    const jwks = createRemoteJWKSet(
      new URL('https://appleid.apple.com/auth/keys'),
    );

    try {
      const { payload } = await jwtVerify(idToken, jwks, {
        audience: appleAudience,
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
    } catch (e: any) {
      console.error('[OAuth] Apple jwtVerify failed', {
        message: e?.message ?? String(e),
        name: e?.name,
        code: e?.code,
        node: process.version,
      });

      if (this.isDebugEnabled()) {
        throw new BadRequestException(
          `Invalid Apple token ${e?.message ?? String(e)}`,
        );
      }

      throw new BadRequestException('Invalid Apple token');
    }
  }
}
