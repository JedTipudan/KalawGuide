import { OfflineError, splitStatements, type SQLValue } from './tursoDatabase';

/**
 * Offline-first database for the phone app when the shared online database (Turso) is set up.
 *
 *  • Reads come from a copy of the data kept on the phone (SQLite), so every list and detail page
 *    works with no internet.
 *  • Writes (save a budget, add an expense, favorite, trip…) are saved on the phone at once and put
 *    in an outbox. The outbox is sent to the online database in order as soon as there is internet.
 *  • sync() = send the outbox, then refresh the phone's copy from the online database
 *    (shared tables: all rows; personal tables: only the signed-in user's rows), then re-apply any
 *    change still waiting in the outbox so nothing the user did offline disappears.
 *
 * A few tables stay online-only (accounts, verification documents, activity logs): they are large
 * or private, so they are not copied to every phone. Their reads fall back to the last saved
 * answer (offlineCache) and their writes wait in the outbox when offline.
 */

type Params = SQLValue[] | SQLValue | undefined;
type RunResult = { lastInsertRowId: number; changes: number };

export interface LocalDb {
  getAllAsync<T>(sql: string, params?: SQLValue[] | SQLValue): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SQLValue[] | SQLValue): Promise<T | null>;
  runAsync(sql: string, params?: SQLValue[] | SQLValue): Promise<RunResult>;
  execAsync(sql: string): Promise<void>;
  withExclusiveTransactionAsync?(task: (txn: LocalDb) => Promise<void>): Promise<void>;
}

export interface RemoteDb {
  getAllAsync<T>(sql: string, params?: SQLValue[] | SQLValue): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SQLValue[] | SQLValue): Promise<T | null>;
  runAsync(sql: string, params?: SQLValue[] | SQLValue): Promise<RunResult>;
  getAllFreshAsync<T>(sql: string, params?: SQLValue[] | SQLValue): Promise<T[]>;
  runBatchAsync(stmts: { sql: string; params?: SQLValue[] }[]): Promise<(string | null)[]>;
}

/** Never copied to phones: read online (with the last saved answer as fallback). */
export const ONLINE_ONLY_TABLES = ['users', 'business_documents', 'activity_logs'];

/** Same for everyone: copied in full. */
export const SHARED_TABLES = [
  'destination_categories', 'destinations', 'businesses', 'business_services', 'business_products',
  'emergency_contacts', 'listing_prices', 'listing_facilities', 'listing_revisions',
];

/** Personal: only the signed-in user's rows are copied. Order matters (parents first). */
export const PERSONAL_TABLES: [string, string][] = [
  ['itineraries', 'user_id = ?'],
  ['itinerary_items', 'itinerary_id IN (SELECT id FROM itineraries WHERE user_id = ?)'],
  ['budget_plans', 'user_id = ?'],
  ['expenses', 'user_id = ?'],
  ['favorites', 'user_id = ?'],
  ['notifications', 'user_id = ?'],
  ['assistant_messages', 'user_id = ?'],
];

export const OUTBOX_SCHEMA = `
  CREATE TABLE IF NOT EXISTS _outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, sql TEXT NOT NULL, params TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS _sync_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

const TX = /^\s*(BEGIN|COMMIT|END|ROLLBACK)\b/i;
const PRAGMA = /^\s*PRAGMA\b/i;
const INSERT_OR_IGNORE = /^\s*INSERT\s+OR\s+IGNORE\b/i;
const TABLES_IN = /\b(?:from|join|into|update)\s+["'`]?(\w+)/gi;

export function tablesIn(sql: string): string[] {
  return [...sql.matchAll(TABLES_IN)].map(m => m[1].toLowerCase());
}

const touchesOnlineOnly = (sql: string) => tablesIn(sql).some(t => ONLINE_ONLY_TABLES.includes(t));
const list = (p: Params): SQLValue[] => (p === undefined ? [] : Array.isArray(p) ? p : [p]);

export interface SyncOptions {
  /** The signed-in user's id, or null (personal tables are then left as they are). */
  getUserId: () => Promise<string | null>;
  /** Override which tables are copied (tests). */
  sharedTables?: string[];
  personalTables?: [string, string][];
}

export class SyncedDatabase {
  private inTx = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private columns = new Map<string, string[]>();

  constructor(readonly local: LocalDb, readonly remote: RemoteDb, private readonly opts: SyncOptions) {}

  // ─── The four calls the app uses ───────────────────────────────────────────

  getAllAsync<T>(sql: string, params?: SQLValue[] | SQLValue): Promise<T[]> {
    return touchesOnlineOnly(sql) ? this.remote.getAllAsync<T>(sql, params) : this.local.getAllAsync<T>(sql, params);
  }

  getFirstAsync<T>(sql: string, params?: SQLValue[] | SQLValue): Promise<T | null> {
    return touchesOnlineOnly(sql) ? this.remote.getFirstAsync<T>(sql, params) : this.local.getFirstAsync<T>(sql, params);
  }

  async runAsync(sql: string, params?: SQLValue[] | SQLValue): Promise<RunResult> {
    if (touchesOnlineOnly(sql)) {
      // Online-only tables: write straight to the server; offline, wait in the outbox.
      try {
        return await this.remote.runAsync(sql, params);
      } catch (e) {
        if (!(e instanceof OfflineError)) throw e;
        await this.enqueue(sql, params);
        return { lastInsertRowId: 0, changes: 1 };
      }
    }
    const result = await this.local.runAsync(sql, params);
    // "INSERT OR IGNORE" that changed nothing here (e.g. demo data on every launch) needs no upload.
    if (!(result.changes === 0 && INSERT_OR_IGNORE.test(sql))) await this.enqueue(sql, params);
    return result;
  }

  async execAsync(sql: string): Promise<void> {
    for (const stmt of splitStatements(sql)) {
      const tx = stmt.match(TX);
      if (tx) {
        await this.local.execAsync(stmt);
        const word = tx[1].toUpperCase();
        this.inTx = word === 'BEGIN';
        if (word === 'COMMIT' || word === 'END') this.scheduleFlush();
      } else if (PRAGMA.test(stmt)) {
        await this.local.execAsync(stmt);
      } else {
        await this.runAsync(stmt);
      }
    }
  }

  // ─── Outbox ────────────────────────────────────────────────────────────────

  private async enqueue(sql: string, params: Params): Promise<void> {
    await this.local.runAsync('INSERT INTO _outbox (sql, params, created_at) VALUES (?, ?, ?)',
      [sql, JSON.stringify(list(params)), new Date().toISOString()]);
    if (!this.inTx) this.scheduleFlush();
  }

  /** Changes made on this phone that the online database doesn't have yet. */
  async pendingCount(): Promise<number> {
    return (await this.local.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM _outbox'))?.n ?? 0;
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => { this.flushTimer = null; void this.flush().catch(() => {}); }, 300);
  }

  /** Sends the outbox in order. Returns true when everything was sent. */
  async flush(): Promise<boolean> {
    for (;;) {
      const rows = await this.local.getAllAsync<{ id: number; sql: string; params: string }>(
        'SELECT id, sql, params FROM _outbox ORDER BY id LIMIT 50');
      if (rows.length === 0) return true;
      let errors: (string | null)[];
      try {
        errors = await this.remote.runBatchAsync(rows.map(r => ({ sql: r.sql, params: JSON.parse(r.params) })));
      } catch (e) {
        if (e instanceof OfflineError) return false;
        throw e;
      }
      errors.forEach((err, i) => {
        // The server refused it (e.g. the same favorite added on another phone): drop it, keep going.
        if (err) console.warn('[sync] change not accepted by the online database:', err, rows[i].sql.slice(0, 80));
      });
      await this.local.runAsync('DELETE FROM _outbox WHERE id <= ?', [rows[rows.length - 1].id]);
    }
  }

  // ─── Refresh from the online database ──────────────────────────────────────

  async hasSynced(): Promise<boolean> {
    return !!(await this.local.getFirstAsync<{ value: string }>("SELECT value FROM _sync_meta WHERE key = 'last_pull'"));
  }

  /** Send the outbox, then refresh this phone's copy. Safe to call often: runs one at a time. */
  sync(): Promise<void> {
    if (!this.running) {
      this.running = this.syncOnce().finally(() => { this.running = null; });
    }
    return this.running;
  }

  private async syncOnce(): Promise<void> {
    await this.flush();
    const userId = await this.opts.getUserId().catch(() => null);
    const plan: { table: string; where: string | null }[] = [
      ...(this.opts.sharedTables ?? SHARED_TABLES).map(table => ({ table, where: null })),
      ...(userId ? (this.opts.personalTables ?? PERSONAL_TABLES).map(([table, where]) => ({ table, where })) : []),
    ];

    // 1. Download everything first (throws OfflineError when offline: the copy stays as it is).
    const fetched: { table: string; where: string | null; rows: Record<string, unknown>[] }[] = [];
    for (const p of plan) {
      const rows = await this.remote.getAllFreshAsync<Record<string, unknown>>(
        `SELECT * FROM ${p.table}${p.where ? ` WHERE ${p.where}` : ''}`, p.where ? [userId] : []);
      fetched.push({ ...p, rows });
    }

    // 2. Replace the copy in one transaction, then re-apply changes not yet uploaded.
    const apply = async (db: LocalDb) => {
      for (const f of [...fetched].reverse()) {
        await db.runAsync(`DELETE FROM ${f.table}${f.where ? ` WHERE ${f.where}` : ''}`, f.where ? [userId] : []);
      }
      for (const f of fetched) {
        const cols = await this.localColumns(db, f.table);
        for (const row of f.rows) {
          const use = cols.filter(c => c in row);
          if (use.length === 0) continue;
          await db.runAsync(
            `INSERT OR REPLACE INTO ${f.table} (${use.join(', ')}) VALUES (${use.map(() => '?').join(', ')})`,
            use.map(c => row[c] as SQLValue));
        }
      }
      const pending = await db.getAllAsync<{ sql: string; params: string }>('SELECT sql, params FROM _outbox ORDER BY id');
      for (const p of pending) {
        if (touchesOnlineOnly(p.sql)) continue;
        try { await db.runAsync(p.sql, JSON.parse(p.params)); } catch { /* already in the copy */ }
      }
      await db.runAsync("INSERT OR REPLACE INTO _sync_meta (key, value) VALUES ('last_pull', ?)", [new Date().toISOString()]);
    };

    if (this.local.withExclusiveTransactionAsync) {
      await this.local.withExclusiveTransactionAsync(apply);
    } else {
      await this.local.execAsync('BEGIN');
      try { await apply(this.local); await this.local.execAsync('COMMIT'); } catch (e) { await this.local.execAsync('ROLLBACK'); throw e; }
    }
  }

  private async localColumns(db: LocalDb, table: string): Promise<string[]> {
    const known = this.columns.get(table);
    if (known) return known;
    const cols = (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map(c => c.name);
    this.columns.set(table, cols);
    return cols;
  }
}
