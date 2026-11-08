import { getDatabase } from '../../database/migrations/init';
import { User, AuthSession, SignInCredentials, RegisterCredentials } from '../../types';
import { generateId, now } from '../../utils/helpers';
import { storage } from '../../utils/storage';

const SESSION_KEY = 'kalawguide_session';

// Pure-JS hash — crypto.subtle is unavailable on Hermes (React Native)
function hashPassword(password: string): string {
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

export async function registerWithEmail(
  credentials: RegisterCredentials
): Promise<AuthSession> {
  const db = await getDatabase();

  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM users WHERE email = ?',
    [credentials.email.toLowerCase()]
  );
  if (existing) throw new Error('An account with this email already exists.');

  const passwordHash = hashPassword(credentials.password);
  const userId = generateId();
  const timestamp = now();

  await db.runAsync(
    `INSERT INTO users (id, email, display_name, role, provider, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'email', ?, ?)`,
    [userId, credentials.email.toLowerCase(), credentials.displayName, credentials.role, timestamp, timestamp]
  );

  // Store password hash separately (in production this lives on the backend)
  await storage.setItem(`pwd_${userId}`, passwordHash);

  const user: User = {
    id: userId,
    email: credentials.email.toLowerCase(),
    displayName: credentials.displayName,
    role: credentials.role,
    provider: 'email',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return createSession(user);
}

export async function signInWithEmail(
  credentials: SignInCredentials
): Promise<AuthSession> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<{
    id: string; email: string; display_name: string;
    avatar_url: string | null; role: string; provider: string;
    status: string; created_at: string; updated_at: string;
  }>(
    'SELECT * FROM users WHERE email = ?',
    [credentials.email.toLowerCase()]
  );

  if (!row) throw new Error('No account found with this email address.');
  if (row.status === 'blocked') throw new Error('This account has been restricted by an administrator. Please contact support.');

  const storedHash = await storage.getItem(`pwd_${row.id}`);
  if (!storedHash) throw new Error('Invalid credentials. Please try again.');

  const inputHash = hashPassword(credentials.password);
  if (inputHash !== storedHash) throw new Error('Incorrect password. Please try again.');

  const user: User = {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    role: row.role as User['role'],
    provider: row.provider as User['provider'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return createSession(user);
}

export async function signInWithGoogle(googleUser: {
  id: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<{ session: AuthSession; isNewUser: boolean }> {
  const db = await getDatabase();

  const existing = await db.getFirstAsync<{
    id: string; email: string; display_name: string;
    avatar_url: string | null; role: string; provider: string;
    status: string; created_at: string; updated_at: string;
  }>(
    'SELECT * FROM users WHERE email = ?',
    [googleUser.email.toLowerCase()]
  );

  if (existing) {
    if (existing.status === 'blocked') throw new Error('This account has been restricted by an administrator. Please contact support.');
    const user: User = {
      id: existing.id,
      email: existing.email,
      displayName: existing.display_name,
      avatarUrl: existing.avatar_url ?? undefined,
      role: existing.role as User['role'],
      provider: existing.provider as User['provider'],
      createdAt: existing.created_at,
      updatedAt: existing.updated_at,
    };
    const session = await createSession(user);
    return { session, isNewUser: false };
  }

  const userId = generateId();
  const timestamp = now();

  // New Google users get 'tourist' as default — role-select screen will update it
  await db.runAsync(
    `INSERT INTO users (id, email, display_name, avatar_url, role, provider, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'tourist', 'google', ?, ?)`,
    [userId, googleUser.email.toLowerCase(), googleUser.name, googleUser.picture ?? null, timestamp, timestamp]
  );

  const user: User = {
    id: userId,
    email: googleUser.email.toLowerCase(),
    displayName: googleUser.name,
    avatarUrl: googleUser.picture,
    role: 'tourist',
    provider: 'google',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const session = await createSession(user);
  return { session, isNewUser: true };
}

async function createSession(user: User): Promise<AuthSession> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const token = generateId() + generateId();

  const session: AuthSession = { user, token, expiresAt };
  await storage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function restoreSession(): Promise<AuthSession | null> {
  try {
    const raw = await storage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session: AuthSession = JSON.parse(raw);
    if (new Date(session.expiresAt) < new Date()) {
      await storage.deleteItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  await storage.deleteItem(SESSION_KEY);
}

export async function updateUserRole(userId: string, role: User['role']): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
    [role, now(), userId]
  );

  const raw = await storage.getItem(SESSION_KEY);
  if (raw) {
    const session: AuthSession = JSON.parse(raw);
    session.user.role = role;
    await storage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}
