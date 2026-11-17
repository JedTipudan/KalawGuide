import * as Crypto from 'expo-crypto';

/**
 * Password hashing for accounts stored in the (possibly shared) database.
 *  • New format:  "s256$<salt>$<sha256(salt:password)>"  — random salt per user, via expo-crypto
 *    (works on Android, iOS and web).
 *  • Legacy format: 16 hex chars from the original pure-JS hash. Still accepted, so older accounts
 *    keep working; they are upgraded to the new format on their next sign-in.
 */

const PREFIX = 's256$';

export function legacyHash(password: string): string {
  const str = password + 'kalawguide_salt_2024';
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

function randomSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

export async function hashPassword(password: string, salt = randomSalt()): Promise<string> {
  return `${PREFIX}${salt}$${await sha256(`${salt}:${password}`)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith(PREFIX)) {
    const [, salt] = stored.split('$');
    return (await hashPassword(password, salt)) === stored;
  }
  return legacyHash(password) === stored;
}

export const isLegacyHash = (stored: string | null | undefined) => !!stored && !stored.startsWith(PREFIX);
