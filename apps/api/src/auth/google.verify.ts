import { OAuth2Client, TokenPayload } from 'google-auth-library';

const client = new OAuth2Client();

function redact(v: string | undefined) {
  if (!v) return v;
  const s = String(v);
  return s.length > 18 ? s.slice(0, 8) + '…' + s.slice(-6) : s;
}

function normalizeClientId(v: string | undefined) {
  return (v ?? '').trim();
}

export type GoogleVerified = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  iss?: string;
  aud?: string | string[];
  azp?: string;
};

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleVerified> {
  const expectedAud = normalizeClientId(process.env.GOOGLE_CLIENT_ID);
  if (!expectedAud) {
    throw new Error('GOOGLE_CLIENT_ID missing');
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: expectedAud,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error('Google payload missing');

    // Extra audience check (payload.aud can be string or array depending on libs/versions)
    const aud = (payload as TokenPayload).aud as unknown;
    const audOk =
      typeof aud === 'string'
        ? aud === expectedAud
        : Array.isArray(aud)
          ? aud.includes(expectedAud)
          : false;

    if (!audOk) {
      throw new Error(
        `Audience mismatch aud=${JSON.stringify(aud)} expected=${redact(expectedAud)}`,
      );
    }

    // Minimal required fields
    if (!payload.sub) throw new Error('Google payload missing sub');
    if (!payload.email) throw new Error('Google payload missing email');

    const result: GoogleVerified = {
      sub: payload.sub,
      email: payload.email,
      email_verified: Boolean(payload.email_verified),
      name: payload.name ?? undefined,
      given_name: payload.given_name ?? undefined,
      family_name: payload.family_name ?? undefined,
      picture: payload.picture ?? undefined,
      iss: payload.iss ?? undefined,
      aud: (payload as any).aud ?? undefined,
      azp: (payload as any).azp ?? undefined,
    };

    // Optional debug (no token logging)
    if (process.env.OAUTH_DEBUG === 'true') {
      console.log('Google verify OK', {
        email: result.email,
        aud: Array.isArray(result.aud) ? result.aud[0] : result.aud,
        azp: result.azp,
        expectedAud: redact(expectedAud),
        node: process.version,
      });
    }

    return result;
  } catch (e: any) {
    if (process.env.OAUTH_DEBUG === 'true') {
      console.error('Google verifyIdToken failed', {
        msg: e?.message,
        name: e?.name,
        code: e?.code,
        expectedAud: redact(normalizeClientId(process.env.GOOGLE_CLIENT_ID)),
        node: process.version,
      });
    }
    throw e;
  }
}
