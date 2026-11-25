import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import type { QueryCache } from './tursoDatabase';

/**
 * Offline copy of what the shared online database last returned.
 *
 * Every successful read (destinations, businesses, prices, favorites…) is saved here, keyed by its
 * SQL + parameters. With no internet, the same read is answered from this copy, so Explore,
 * Local Businesses and the detail pages still show the latest list the phone saw while online.
 *
 * Phones (APK/iOS): a small separate SQLite file — no size limit, so rows with photos fit.
 * Web: localStorage (best effort; ~5 MB, a full quota just skips saving).
 */

const memory = new Map<string, string>();

let nativeDb: Promise<SQLite.SQLiteDatabase> | null = null;
function openNative(): Promise<SQLite.SQLiteDatabase> {
  if (!nativeDb) {
    nativeDb = SQLite.openDatabaseAsync('kalawguide-offline.db').then(async db => {
      await db.execAsync('CREATE TABLE IF NOT EXISTS query_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, saved_at TEXT NOT NULL);');
      return db;
    });
    nativeDb.catch(() => { nativeDb = null; });
  }
  return nativeDb;
}

const WEB_PREFIX = 'kalaw.offline.';

export const offlineCache: QueryCache = {
  async get(key) {
    const hit = memory.get(key);
    if (hit !== undefined) return hit;
    try {
      let value: string | null = null;
      if (Platform.OS === 'web') {
        value = typeof localStorage !== 'undefined' ? localStorage.getItem(WEB_PREFIX + key) : null;
      } else {
        const db = await openNative();
        value = (await db.getFirstAsync<{ value: string }>('SELECT value FROM query_cache WHERE key = ?', [key]))?.value ?? null;
      }
      if (value !== null) memory.set(key, value);
      return value;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    if (memory.get(key) === value) return;
    memory.set(key, value);
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(WEB_PREFIX + key, value);
      } else {
        const db = await openNative();
        await db.runAsync('INSERT OR REPLACE INTO query_cache (key, value, saved_at) VALUES (?, ?, ?)',
          [key, value, new Date().toISOString()]);
      }
    } catch {
      /* storage full or blocked: the in-memory copy still serves this session */
    }
  },
};
