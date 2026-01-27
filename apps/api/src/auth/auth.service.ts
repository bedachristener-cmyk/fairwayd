import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";

type OAuthProvider = "GOOGLE" | "APPLE" | "FACEBOOK";

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async loginWithOAuth(params: {
    provider: OAuthProvider;
    idToken?: string;
    accessToken?: string;
  }) {
    const { provider } = params;

    if (provider === "GOOGLE") {
      if (!params.idToken) throw new BadRequestException("Missing idToken");
      const profile = await this.verifyGoogleIdToken(params.idToken);
      return this.issueTokenForProfile("GOOGLE", profile);
    }

    if (provider === "APPLE") {
      if (!params.idToken) throw new BadRequestException("Missing idToken");
      const profile = await this.verifyAppleIdToken(params.idToken);
      return this.issueTokenForProfile("APPLE", profile);
    }

    // Facebook later (usually accessToken -> graph API -> id/email)
    if (provider === "FACEBOOK") {
      throw new BadRequestException("Facebook login not implemented yet");
    }

    throw new BadRequestException("Unknown provider");
  }

  private async issueTokenForProfile(
    provider: OAuthProvider,
    profile: { providerUserId: string; email?: string | null; name?: string | null; avatarUrl?: string | null },
  ) {
    const providerUserId = profile.providerUserId;
    if (!providerUserId) throw new BadRequestException("Missing provider user id");

    // 1) Find existing AuthAccount
    const existing = await this.prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: { provider, providerUserId },
      },
      include: { user: true },
    });

    let user = existing?.user;

    // 2) If no account yet, create user + account
    if (!user) {
      // handle must be unique and required in your schema -> create a safe placeholder
      const baseHandle = this.suggestHandle(profile.email, profile.name);
      const handle = await this.makeUniqueHandle(baseHandle);

      user = await this.prisma.user.create({
        data: {
          email: profile.email ?? null,
          password: null,
          handle,
          name: profile.name ?? handle,
          avatarUrl: profile.avatarUrl ?? null,
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
      // 3) Keep user email/avatar in sync if you want (safe minimal updates)
      const patch: any = {};
      if (!user.email && profile.email) patch.email = profile.email;
      if (!user.avatarUrl && profile.avatarUrl) patch.avatarUrl = profile.avatarUrl;

      if (Object.keys(patch).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: patch,
        });
      }
    }

    // 4) Issue Fairwayd JWT
    const token = await this.jwt.signAsync({
      sub: user.id,
      handle: user.handle,
    });

    return {
      token,
      user: {
        id: user.id,
        handle: user.handle,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  private suggestHandle(email?: string | null, name?: string | null) {
    const raw =
      (email?.split("@")[0] ?? "") ||
      (name ?? "") ||
      "golfer";
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20) || "golfer";
  }

  private async makeUniqueHandle(base: string) {
    let candidate = base;
    for (let i = 0; i < 50; i++) {
      const exists = await this.prisma.user.findUnique({ where: { handle: candidate } });
      if (!exists) return candidate;
      candidate = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
    }
    // fallback
    return `${base}${Date.now().toString().slice(-6)}`;
  }

	private async verifyGoogleIdToken(idToken: string) {
	  try {
		const ticket = await this.googleClient.verifyIdToken({
		  idToken,
		  audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();
		if (!payload?.sub) throw new Error("Missing sub");

		return {
		  providerUserId: payload.sub,
		  email: payload.email ?? null,
		  name: payload.name ?? null,
		  avatarUrl: payload.picture ?? null,
		};
	  } catch (e) {
		// Wichtig: ungültiges Token soll 400 sein, nicht 500
		throw new BadRequestException("Invalid Google token");
	  }
	}


  private async verifyAppleIdToken(idToken: string) {
    // Apple JWKS
    const jwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
    const { payload } = await jwtVerify(idToken, jwks, {
      audience: process.env.APPLE_CLIENT_ID,
      issuer: "https://appleid.apple.com",
    });

    const sub = payload.sub;
    if (!sub) throw new BadRequestException("Invalid Apple token");

    return {
      providerUserId: String(sub),
      email: typeof payload.email === "string" ? payload.email : null,
      name: null,      // Apple often doesn't provide name on repeated logins
      avatarUrl: null,
    };
  }
  async devLogin(handle?: string) {
	  const safeHandle = (handle ?? "beda_dev")
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, "_")
		.slice(0, 20) || "beda_dev";

	  // Find or create a user
	  let user = await this.prisma.user.findUnique({ where: { handle: safeHandle } });

	  if (!user) {
		user = await this.prisma.user.create({
		  data: {
			handle: safeHandle,
			name: safeHandle,
			email: null,
			password: null,
		  },
		});
	  }

	  const token = await this.jwt.signAsync({
		sub: user.id,
		handle: user.handle,
	  });

	  return {
		token,
		user: { id: user.id, handle: user.handle, name: user.name, avatarUrl: user.avatarUrl },
	  };
}

}
