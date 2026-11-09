import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Single shared promise stored on globalThis so it survives across module
// re-evaluations on web (HMR). This guarantees openDatabaseAsync is called
// exactly once — concurrent callers all await the same promise.
declare const globalThis: { __kalawguide_db_promise?: Promise<SQLite.SQLiteDatabase> };

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!globalThis.__kalawguide_db_promise) {
    globalThis.__kalawguide_db_promise = SQLite.openDatabaseAsync('kalawguide.db')
      .then(async db => {
        await runMigrations(db);
        return db;
      })
      .catch(e => {
        // Reset on failure so a future call can retry
        globalThis.__kalawguide_db_promise = undefined;
        throw e;
      });
  }
  return globalThis.__kalawguide_db_promise;
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
    CREATE TABLE IF NOT EXISTS booking_requests (
      id TEXT PRIMARY KEY, tourist_id TEXT NOT NULL, business_id TEXT NOT NULL,
      service_id TEXT, requested_date TEXT, guest_count INTEGER, notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending', owner_note TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
    );
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

  await db.execAsync('PRAGMA foreign_keys = ON;');
}
