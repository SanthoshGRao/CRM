import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'crm-api-key-store';

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, 32);
}

/**
 * Reversible encryption for API keys, separate from `hashApiKey` (which is
 * what auth actually checks against). Lets an owner re-copy a key later
 * instead of only ever seeing it once at creation.
 */
export function encryptApiKey(raw: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString('base64')).join('.');
}

export function decryptApiKey(stored: string, secret: string): string {
  const [ivB64, tagB64, dataB64] = stored.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted API key.');

  const key = deriveKey(secret);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}
