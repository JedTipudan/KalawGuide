import * as SQLite from 'expo-sqlite';
import { AppState, Platform } from 'react-native';
import { OfflineError, TursoDatabase, remoteConfigFromEnv } from '../remote/tursoDatabase';
import { offlineCache } from '../remote/offlineCache';
import { OUTBOX_SCHEMA, SyncedDatabase, type LocalDb } from '../remote/syncedDatabase';
import { storage } from '../../utils/storage';

/**
 * Two modes, same SQL:
 *  • Shared online database (Turso) when EXPO_PUBLIC_TURSO_DATABASE_URL + EXPO_PUBLIC_TURSO_AUTH_TOKEN
 *    are set — every phone, the APK and the website see the same users, businesses and approvals.
 *    On phones the app works on a synced copy, so it also works offline (syncedDatabase.ts).
 *  • On-device SQLite otherwise (each device/browser keeps its own copy, works fully offline).
 */
export const DATABASE_MODE: 'online' | 'device' = remoteConfigFromEnv() ? 'online' : 'device';

// Single shared promise stored on globalThis so it survives across module
// re-evaluations on web (HMR). This guarantees the database is opened exactly once.
declare const globalThis: {
  __kalawguide_db_promise?: Promise<SQLite.SQLiteDatabase>;
  __kalawguide_synced?: SyncedDatabase;
};

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!globalThis.__kalawguide_db_promise) {
    globalThis.__kalawguide_db_promise = openDatabase()
      .catch(e => {
        // Reset on failure so a future call can retry
        globalThis.__kalawguide_db_promise = undefined;
        // Web: the browser lets only one window hold the on-device database. A second window
        // (e.g. the installed app and a browser tab of the site) fails with "Invalid VFS state".
        const msg = e instanceof Error ? e.message : String(e);
        if (/VFS|AccessHandle|NoModificationAllowed/i.test(msg)) {
          throw new Error('KalawGuide is already open in another window or tab. Close the other one, then reload this page.');
        }
        throw e;
      });
  }
  return globalThis.__kalawguide_db_promise;
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const cfg = remoteConfigFromEnv();
  if (!cfg) {
    const db = await SQLite.openDatabaseAsync('kalawguide.db');
    await runMigrations(db);
    return db;
  }

  const remote = new TursoDatabase({ ...cfg, cache: offlineCache });
  await runMigrations(remote as unknown as SQLite.SQLiteDatabase).catch(e => {
    // Offline: the tables already exist on the server. Run them again next launch with internet.
    if (!(e instanceof OfflineError)) throw e;
  });

  // Phones: work on a copy kept on the device and sync it (see syncedDatabase.ts), so everything,
  // including saving, works offline. Website: online database with saved answers as fallback.
  if (Platform.OS !== 'web') {
    try {
      const synced = await openSynced(remote);
      return synced as unknown as SQLite.SQLiteDatabase;
    } catch (e) {
      console.warn('[sync] on-device copy unavailable, using the online database directly:', e);
    }
  }
  return remote as unknown as SQLite.SQLiteDatabase;
}

async function openSynced(remote: TursoDatabase): Promise<SyncedDatabase> {
  const local = await SQLite.openDatabaseAsync('kalawguide-replica.db');
  await runMigrations(local);
  // The copy has no accounts table rows (they stay online), so foreign keys can't be checked here;
  // the online database checks them. Wait (don't fail) while a sync briefly locks the file.
  await local.execAsync('PRAGMA foreign_keys = OFF; PRAGMA busy_timeout = 5000;');
  await local.execAsync(OUTBOX_SCHEMA);

  const synced = new SyncedDatabase(local as unknown as LocalDb, remote, { getUserId: signedInUserId });
  globalThis.__kalawguide_synced = synced;
  if (await synced.hasSynced()) {
    void synced.sync().catch(() => {});
  } else {
    // First launch: wait for the data (up to 20 s) so the first screens aren't empty.
    await Promise.race([synced.sync().catch(() => {}), new Promise(r => setTimeout(r, 20000))]);
  }
  startAutoSync(synced);
  return synced;
}

async function signedInUserId(): Promise<string | null> {
  const raw = await storage.getItem('kalawguide_session');
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { user?: { id?: string } }).user?.id ?? null;
  } catch {
    return null;
  }
}

const RESYNC_MS = 2 * 60 * 1000;

/** Sync when the app comes back to the screen, when internet returns, and send pending changes every minute. */
function startAutoSync(db: SyncedDatabase): void {
  let last = Date.now();
  const syncSoon = (force = false) => {
    if (!force && Date.now() - last < RESYNC_MS) { void db.flush().catch(() => {}); return; }
    last = Date.now();
    void db.sync().catch(() => {});
  };
  AppState.addEventListener('change', s => { if (s === 'active') syncSoon(); });
  // Loaded here (phones only) so the website and tests don't pull in the native network module.
  import('expo-network')
    .then(Network => Network.addNetworkStateListener(e => { if (e.isConnected && e.isInternetReachable !== false) syncSoon(true); }))
    .catch(() => { /* network events unavailable: AppState and the timer still sync */ });
  setInterval(() => {
    void db.pendingCount().then(n => { if (n > 0) void db.flush().catch(() => {}); }).catch(() => {});
  }, 60000);
}

/** Sync now (e.g. right after sign-in, so the user's own budgets and trips come down). */
export function requestSync(): Promise<void> {
  return globalThis.__kalawguide_synced?.sync().catch(() => {}) ?? Promise.resolve();
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = OFF;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
      avatar_url TEXT, role TEXT NOT NULL, provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS destination_categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS destinations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
      category_id TEXT NOT NULL, location TEXT NOT NULL, latitude REAL, longitude REAL,
      cover_image_url TEXT, image_urls TEXT NOT NULL DEFAULT '[]',
      estimated_fee REAL, fee_verified INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL,
      description TEXT NOT NULL, category TEXT NOT NULL, address TEXT NOT NULL,
      contact_number TEXT, email TEXT, website TEXT, facebook TEXT,
      municipality TEXT, barangay TEXT, operating_hours TEXT, draft_data TEXT,
      cover_image_url TEXT, image_urls TEXT NOT NULL DEFAULT '[]',
      verification_status TEXT NOT NULL DEFAULT 'not_submitted',
      verification_note TEXT, is_active INTEGER NOT NULL DEFAULT 1,
      latitude REAL, longitude REAL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS business_documents (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, document_type TEXT NOT NULL,
      label TEXT NOT NULL, uri TEXT NOT NULL, mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      uploaded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS document_checks (
      document_id TEXT PRIMARY KEY, business_id TEXT NOT NULL, image_hash TEXT NOT NULL,
      doc_number TEXT, verdict TEXT NOT NULL, score INTEGER NOT NULL, summary TEXT,
      flags TEXT NOT NULL DEFAULT '[]', findings TEXT, model TEXT, checked_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_document_checks_hash ON document_checks(image_hash);
    CREATE INDEX IF NOT EXISTS idx_document_checks_number ON document_checks(doc_number);
    CREATE TABLE IF NOT EXISTS business_services (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL,
      description TEXT, price REAL NOT NULL, price_verified INTEGER NOT NULL DEFAULT 0,
      duration TEXT, is_available INTEGER NOT NULL DEFAULT 1, image_url TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS business_products (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL,
      description TEXT, price REAL NOT NULL, price_verified INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1, image_url TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    DROP TABLE IF EXISTS booking_requests; -- bookings were removed: KalawGuide advertises and verifies businesses
    CREATE TABLE IF NOT EXISTS itineraries (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );
    CREATE TABLE IF NOT EXISTS itinerary_items (
      id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, day_number INTEGER NOT NULL,
      time TEXT, title TEXT NOT NULL, description TEXT, destination_id TEXT,
      estimated_cost REAL, sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS budget_plans (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      destination_id TEXT, destination_name TEXT,
      travelers INTEGER NOT NULL DEFAULT 1, duration_days INTEGER NOT NULL DEFAULT 1,
      transportation REAL NOT NULL DEFAULT 0, accommodation REAL NOT NULL DEFAULT 0,
      food REAL NOT NULL DEFAULT 0, activities REAL NOT NULL DEFAULT 0,
      miscellaneous REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, itinerary_id TEXT,
      name TEXT NOT NULL, amount REAL NOT NULL, category TEXT NOT NULL,
      date TEXT NOT NULL, description TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, organization TEXT NOT NULL,
      contact_number TEXT NOT NULL, description TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0, last_verified_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL,
      title TEXT NOT NULL, body TEXT NOT NULL, data TEXT,
      is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      operation TEXT NOT NULL, payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, last_attempt_at TEXT
    );
    CREATE TABLE IF NOT EXISTS assistant_messages (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL,
      content TEXT NOT NULL, timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS listing_prices (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, title TEXT NOT NULL,
      amount REAL NOT NULL, unit TEXT NOT NULL DEFAULT 'per person',
      category TEXT NOT NULL DEFAULT 'entrance_fee', description TEXT,
      conditions TEXT, is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS listing_facilities (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL,
      icon TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS listing_revisions (
      id TEXT PRIMARY KEY, business_id TEXT NOT NULL, submitted_by TEXT NOT NULL,
      field_name TEXT NOT NULL, old_value TEXT, new_value TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', reviewed_by TEXT,
      review_note TEXT, reviewed_at TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL, created_at TEXT NOT NULL,
      UNIQUE(user_id, entity_type, entity_id)
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL,
      entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      entity_name TEXT, details TEXT, created_at TEXT NOT NULL
    );
  `);

  // Incremental column migrations — safe on existing installs (columns are only added once).
  const assistantCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(assistant_messages)');
  if (!assistantCols.some(c => c.name === 'user_id')) {
    await db.execAsync('ALTER TABLE assistant_messages ADD COLUMN user_id TEXT;');
  }
  if (!assistantCols.some(c => c.name === 'metadata')) {
    await db.execAsync('ALTER TABLE assistant_messages ADD COLUMN metadata TEXT;');
  }
  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_assistant_messages_user ON assistant_messages(user_id, timestamp);'
  );

  // Password hashes live in the database (not only on the device that registered), so an account
  // created on one phone can sign in on any other phone or on the website.
  const userCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(users)');
  if (!userCols.some(c => c.name === 'password_hash')) {
    await db.execAsync('ALTER TABLE users ADD COLUMN password_hash TEXT;');
  }

  await db.execAsync('PRAGMA foreign_keys = ON;');
}
