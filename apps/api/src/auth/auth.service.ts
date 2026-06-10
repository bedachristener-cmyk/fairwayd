import {
  BadRequestException,
  Injectable,
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { randomInt } from 'node:crypto';
import { MailService } from './mail.service';
import * as bcrypt from 'bcryptjs';

type OAuthProvider = 'GOOGLE' | 'APPLE' | 'FACEBOOK';

const MIN_HANDLE_LENGTH = 3;
const CURRENT_TERMS_VERSION = 'v1';
const CURRENT_PRIVACY_VERSION = 'v1';
const EMAIL_VERIFICATION_TTL_MS = 15 * 60 * 1000;
const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const FORGOT_PASSWORD_RESPONSE = {
  message: 'If an account exists for this email, we sent a reset code.',
};

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

  async loginWithPassword(emailInput: string, passwordInput: string) {
    const email = this.normalizeEmail(emailInput);
    const password = String(passwordInput ?? '');

    if (!password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user?.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'EMAIL_NOT_VERIFIED',
      });
    }

    const ok = await this.verifyPassword(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueJwtResponse(user);
  }

  async registerWithPassword(params: {
    name?: string;
    email?: string;
    password?: string;
    passwordConfirm?: string;
    acceptedTerms?: boolean;
    acceptedPrivacy?: boolean;
  }) {
    const name = String(params.name ?? '').trim();
    const email = this.normalizeEmail(String(params.email ?? ''));
    const password = this.validatePassword(params.password ?? '');
    const passwordConfirm = String(params.passwordConfirm ?? '');
    const acceptedTerms = params.acceptedTerms === true;
    const acceptedPrivacy = params.acceptedPrivacy === true;

    if (name.length < 2) {
      throw new BadRequestException('Name must be at least 2 characters');
    }
    if (password !== passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      throw new BadRequestException('Terms and Privacy Policy must be accepted');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hash = await this.hashPassword(password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hash,
          name,
          handle: null,
          avatarUrl: null,
          termsAcceptedAt: new Date(),
          termsVersion: CURRENT_TERMS_VERSION,
          privacyAcceptedAt: new Date(),
          privacyVersion: CURRENT_PRIVACY_VERSION,
        },
      });

      await this.createAndSendEmailVerificationCode(user.id, email);

      return {
        requiresEmailVerification: true,
        email,
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }

      throw e;
    }
  }

  async verifyEmailCode(emailInput: string, codeInput: string) {
    const email = this.normalizeEmail(emailInput);
    const code = this.normalizeVerificationCode(codeInput);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    if (user.emailVerifiedAt) {
      return this.issueJwtResponse(user);
    }

    const row = await this.prisma.emailVerificationCode.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!row) {
      throw new BadRequestException('Invalid verification code');
    }

    if (row.attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many verification attempts');
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Verification code expired');
    }

    const expectedHash = this.hashEmailVerificationCode(user.id, code);
    if (expectedHash !== row.codeHash) {
      await this.prisma.emailVerificationCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code');
    }

    const verifiedUser = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });

      return tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    });

    return this.issueJwtResponse(verifiedUser);
  }

  async resendEmailVerificationCode(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { ok: true };
    }

    if (user.emailVerifiedAt) {
      return { ok: true, alreadyVerified: true };
    }

    await this.prisma.emailVerificationCode.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    await this.createAndSendEmailVerificationCode(user.id, email);
    return { ok: true };
  }

  async forgotPassword(emailInput: string) {
    const email = this.normalizeEmail(emailInput);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user?.password) {
      return FORGOT_PASSWORD_RESPONSE;
    }

    await this.prisma.passwordResetCode.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    try {
      await this.createAndSendPasswordResetCode(user.id, email, user.name);
    } catch (err) {
      console.error('[PasswordReset] Failed to send reset code', {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return FORGOT_PASSWORD_RESPONSE;
  }

  async resetPassword(emailInput: string, codeInput: string, newPasswordInput: string) {
    const email = this.normalizeEmail(emailInput);
    const code = this.normalizeVerificationCode(codeInput);
    const newPassword = this.validatePassword(newPasswordInput);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user?.password) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const row = await this.prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!row) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    if (row.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many reset attempts');
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Reset code expired');
    }

    const expectedHash = this.hashPasswordResetCode(user.id, code);
    if (expectedHash !== row.codeHash) {
      await this.prisma.passwordResetCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid reset code');
    }

    const hash = await this.hashPassword(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetCode.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hash,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    });

    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPasswordInput: string,
    newPasswordInput: string,
  ) {
    const currentPassword = String(currentPasswordInput ?? '');
    const newPassword = this.validatePassword(newPasswordInput);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException(
        'This account uses Google Sign-In. Password management is not available.',
      );
    }

    const ok = await this.verifyPassword(currentPassword, user.password);
    if (!ok) {
      throw new UnauthorizedException('Wrong current password');
    }

    const hash = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });

    return { success: true };
  }

  async setPassword(userId: string, passwordInput: string) {
    const password = this.validatePassword(passwordInput);

    const hash = await this.hashPassword(password);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    return { success: true };
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

      if (existing) {
        if (existing.emailVerifiedAt) return existing;

        return tx.user.update({
          where: { id: existing.id },
          data: { emailVerifiedAt: new Date() },
        });
      }

      return tx.user.create({
        data: {
          email: row.email,
          password: null,
          handle: await this.generateEmailHandle(row.email, tx),
          name: null,
          avatarUrl: null,
          emailVerifiedAt: new Date(),
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
            emailVerifiedAt: profile.email ? new Date() : null,
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
        if (profile.email && !user.emailVerifiedAt)
          patch.emailVerifiedAt = new Date();

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
    emailVerifiedAt?: Date | null;
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
        emailVerifiedAt: user.emailVerifiedAt ?? null,
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

  private generateEmailVerificationCode() {
    return randomInt(100000, 1000000).toString();
  }

  private normalizeVerificationCode(codeInput: string) {
    const code = String(codeInput ?? '').replace(/\D/g, '');
    if (code.length !== 6) {
      throw new BadRequestException('Invalid verification code');
    }
    return code;
  }

  private hashEmailVerificationCode(userId: string, code: string) {
    return createHash('sha256').update(`${userId}:${code}`).digest('hex');
  }

  private validatePassword(passwordInput: string) {
    const password = String(passwordInput ?? '');
    if (!password.trim()) {
      throw new BadRequestException('Password is required');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    return password;
  }

  private hashPasswordResetCode(userId: string, code: string) {
    return createHash('sha256')
      .update(`password-reset:${userId}:${code}`)
      .digest('hex');
  }

  private async createAndSendEmailVerificationCode(userId: string, email: string) {
    const code = this.generateEmailVerificationCode();

    await this.prisma.emailVerificationCode.create({
      data: {
        userId,
        codeHash: this.hashEmailVerificationCode(userId, code),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });

    try {
      return await this.mail.sendVerificationCode(email, code);
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : String(err);

      console.error('[EmailVerification] Mail send failed', {
        message: safeDetail,
      });

      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Could not send verification code. Please try again later.',
        );
      }

      throw new ServiceUnavailableException({
        message: 'Could not send verification code',
        detail: safeDetail,
      });
    }
  }

  private async createAndSendPasswordResetCode(
    userId: string,
    email: string,
    name?: string | null,
  ) {
    const code = this.generateEmailVerificationCode();

    await this.prisma.passwordResetCode.create({
      data: {
        userId,
        codeHash: this.hashPasswordResetCode(userId, code),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    try {
      return await this.mail.sendPasswordResetCode(email, code, name);
    } catch (err) {
      const safeDetail = err instanceof Error ? err.message : String(err);

      console.error('[PasswordReset] Mail send failed', {
        message: safeDetail,
      });

      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Could not send reset code. Please try again later.',
        );
      }

      throw new ServiceUnavailableException({
        message: 'Could not send reset code',
        detail: safeDetail,
      });
    }
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
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
