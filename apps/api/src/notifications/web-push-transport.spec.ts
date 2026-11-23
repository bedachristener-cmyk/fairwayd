import {
  createECDH, createHmac, createVerify, randomBytes,
} from 'node:crypto';
import { createVapidToken, encryptPushPayload, validatePushEndpoint } from './web-push-transport';

function extract(salt: Buffer, key: Buffer) {
  return createHmac('sha256', salt).update(key).digest();
}
function expand(prk: Buffer, info: Buffer, size: number) {
  return createHmac('sha256', prk).update(Buffer.concat([info, Buffer.from([1])]))
    .digest().subarray(0, size);
}

describe('Web Push crypto', () => {
  it('rejects unsafe endpoint URLs', () => {
    expect(validatePushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(validatePushEndpoint('https://web.push.apple.com/q/abc')).toBe(true);
    for (const url of ['http://fcm.googleapis.com/a', 'https://127.0.0.1/a',
      'https://localhost/a', 'https://server.internal/a',
      'https://user:password@push.example.com/a', 'https://[::1]/a']) {
      expect(validatePushEndpoint(url)).toBe(false);
    }
  });
  it('creates a verifiable VAPID ES256 token with the endpoint origin as audience', () => {
    const vapid = createECDH('prime256v1');
    const pub = vapid.generateKeys();
    const privateKey = vapid.getPrivateKey();
    const jwt = createVapidToken(
      'https://push.example.com/subscription/123',
      'mailto:admin@example.com',
      pub.toString('base64url'),
      privateKey.toString('base64url'),
      1700000000,
    );
    const [header, payload, signature] = jwt.split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString()).alg).toBe('ES256');
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toEqual({
      aud: 'https://push.example.com', exp: 1700043200, sub: 'mailto:admin@example.com',
    });
    const verifier = createVerify('SHA256');
    verifier.update(header + '.' + payload);
    verifier.end();
    const key = {
      key: Buffer.concat([
        Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex'),
        pub,
      ]),
      format: 'der' as const,
      type: 'spki' as const,
      dsaEncoding: 'ieee-p1363' as const,
    };
    expect(verifier.verify(key, Buffer.from(signature, 'base64url'))).toBe(true);
  });

  it('encrypts aes128gcm payload that a receiver can decrypt', () => {
    const receiver = createECDH('prime256v1');
    const receiverPublic = receiver.generateKeys();
    const auth = randomBytes(16);
    const payload = '{"title":"Trip updated"}';
    const encoded = encryptPushPayload({
      p256dh: receiverPublic.toString('base64url'),
      auth: auth.toString('base64url'),
    }, payload);
    expect(encoded.readUInt32BE(16)).toBe(4096);
    expect(encoded[20]).toBe(65);
    const salt = encoded.subarray(0, 16);
    const senderPublic = encoded.subarray(21, 86);
    const secret = receiver.computeSecret(senderPublic);
    const info = Buffer.concat([
      Buffer.from('WebPush: info\0'), receiverPublic, senderPublic,
    ]);
    const ikm = expand(extract(auth, secret), info, 32);
    const prk = extract(salt, ikm);
    const cek = expand(prk, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
    const nonce = expand(prk, Buffer.from('Content-Encoding: nonce\0'), 12);
    const ciphertext = encoded.subarray(86);
    const { createDecipheriv } = require('node:crypto') as typeof import('node:crypto');
    const decipher = createDecipheriv('aes-128-gcm', cek, nonce);
    decipher.setAuthTag(ciphertext.subarray(-16));
    const plain = Buffer.concat([
      decipher.update(ciphertext.subarray(0, -16)), decipher.final(),
    ]);
    expect(plain.subarray(0, -1).toString()).toBe(payload);
    expect(plain[plain.length - 1]).toBe(2);
  });
});
