import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import ApiError from './ApiError.js';

const VERSION = 'v1';

const getKey = () => {
  const secret = String(
    process.env.POLLINATIONS_TOKEN_ENCRYPTION_KEY ?? ''
  ).trim();
  if (secret.length < 32) {
    throw new ApiError(503, 'Pollinations token encryption is not configured');
  }
  return createHash('sha256').update(secret).digest();
};

export const encryptSecret = value => {
  const plaintext = String(value ?? '');
  if (!plaintext) throw new ApiError(500, 'Cannot encrypt an empty secret');

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
};

export const decryptSecret = envelope => {
  const [version, ivValue, tagValue, ciphertextValue, extra] = String(
    envelope ?? ''
  ).split('.');
  if (
    version !== VERSION ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue ||
    extra
  ) {
    throw new ApiError(500, 'Encrypted secret has an invalid format');
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      getKey(),
      Buffer.from(ivValue, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new ApiError(500, 'Unable to decrypt Pollinations credentials');
  }
};
