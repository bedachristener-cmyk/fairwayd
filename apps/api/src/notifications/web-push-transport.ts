import { isIP } from 'node:net';
import {
  createECDH,
  createHmac,
  createPrivateKey,
  createSign,
  randomBytes,
  createCipheriv,
} from 'node:crypto';

/**
 * RFC 8291 aes128gcm Web Push encryption and RFC 8292 VAPID authentication.
 * Uses Node built-ins: no additional package or lockfile change required.
 */
export type PushDevice = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export class PushTransportError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

function b64url(value: Buffer): string {
  return value.toString('base64url');
}

function hkdfExtract(salt: Buffer, ikm: Buffer): Buffer {
  return createHmac('sha256', salt).update(ikm).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  const result: Buffer[] = [];
  let previous = Buffer.alloc(0);
  let counter = 1;
  while (Buffer.concat(result).length < length) {
    previous = createHmac('sha256', prk)
      .update(Buffer.concat([previous, info, Buffer.from([counter++])]))
      .digest();
    result.push(previous);
  }
  return Buffer.concat(result).subarray(0, length);
}

function label(value: string): Buffer {
  return Buffer.from(value + '\0', 'utf8');
}

export function encryptPushPayload(
  device: Pick<PushDevice, 'p256dh' | 'auth'>,
  payload: string,
): Buffer {
  const receiverKey = Buffer.from(device.p256dh, 'base64url');
  const authSecret = Buffer.from(device.auth, 'base64url');
  if (receiverKey.length !== 65 || receiverKey[0] !== 4 || authSecret.length !== 16) {
    throw new Error('Invalid Web Push subscription keys');
  }
  const sender = createECDH('prime256v1');
  const senderPublicKey = sender.generateKeys();
  const sharedSecret = sender.computeSecret(receiverKey);
  const info = Buffer.concat([
    label('WebPush: info'),
    receiverKey,
    senderPublicKey,
  ]);
  const ikm = hkdfExpand(hkdfExtract(authSecret, sharedSecret), info, 32);
  const salt = randomBytes(16);
  const prk = hkdfExtract(salt, ikm);
  const cek = hkdfExpand(prk, label('Content-Encoding: aes128gcm'), 16);
  const nonce = hkdfExpand(prk, label('Content-Encoding: nonce'), 12);
  const plaintext = Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])]);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header[20] = senderPublicKey.length;
  return Buffer.concat([header, senderPublicKey, encrypted]);
}

export function createVapidToken(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const audience = new URL(endpoint).origin;
  if (subject.trim() !== subject || subject.includes(' ') ||
      !(subject.startsWith('mailto:') && subject.slice(7).includes('@') ||
        subject.startsWith('https://'))) {
    throw new Error('VAPID subject must be mailto: or https:');
  }
  const publicBytes = Buffer.from(publicKey, 'base64url');
  const privateBytes = Buffer.from(privateKey, 'base64url');
  if (publicBytes.length !== 65 || publicBytes[0] !== 4 || privateBytes.length !== 32) {
    throw new Error('Invalid VAPID key pair');
  }
  const privateJwk = {
    kty: 'EC' as const, crv: 'P-256' as const,
    x: b64url(publicBytes.subarray(1, 33)),
    y: b64url(publicBytes.subarray(33, 65)),
    d: b64url(privateBytes),
  };
  const signingInput = [
    b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))),
    b64url(Buffer.from(JSON.stringify({
      aud: audience, exp: nowSeconds + 12 * 60 * 60, sub: subject,
    }))),
  ].join('.');
  const signature = createSign('SHA256')
    .update(signingInput)
    .end()
    .sign({ key: createPrivateKey({ key: privateJwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' });
  return signingInput + '.' + b64url(signature);
}

export function validatePushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase().replace(/[.]$/, '');
    // Browser subscriptions use a small set of trusted push-service hosts.
    // A generic public hostname could resolve to an internal address (SSRF).
    const trustedService = host === 'fcm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host === 'web.push.apple.com' ||
      (host.endsWith('.push.apple.com') && host !== 'push.apple.com');
    return url.protocol === 'https:' && !url.username && !url.password &&
      !isIP(host) && trustedService && url.port === '' &&
      !url.hash && !url.search;
  } catch {
    return false;
  }
}

export async function sendWebPush(
  device: PushDevice,
  payload: string,
  config: { publicKey: string; privateKey: string; subject: string },
): Promise<void> {
  if (!validatePushEndpoint(device.endpoint)) {
    throw new Error('Invalid push endpoint');
  }
  const encrypted = encryptPushPayload(device, payload);
  const token = createVapidToken(
    device.endpoint, config.subject, config.publicKey, config.privateKey,
  );
  const response = await fetch(device.endpoint, {
    method: 'POST',
    redirect: 'error',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '300',
      'Authorization': `vapid t=${token}, k=${config.publicKey}`,
    },
    body: new Uint8Array(encrypted),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new PushTransportError(response.status, `Push service returned ${response.status}`);
  }
}
