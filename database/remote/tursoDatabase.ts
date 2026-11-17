/**
 * Shared online database: Turso (hosted SQLite / libSQL) over its HTTP API.
 *
 * It implements the four expo-sqlite methods the app uses — getAllAsync, getFirstAsync,
 * runAsync, execAsync — with the same SQL, so every screen works unchanged while all phones,
 * the APK and the website read and write ONE database. That is what lets a business registered
 * on one device, approved by the admin on another, show up for tourists everywhere.
 *
 * Wire format (Turso "Hrana over HTTP"): POST {url}/v2/pipeline, Bearer token,
 * args typed as {type:'integer'|'float'|'text'|'null', value:string}.
 *
 * Transactions: statements between BEGIN and COMMIT are buffered and sent in ONE request
 * (BEGIN … COMMIT), which is atomic on the server and much faster than one request each.
 * A read inside the transaction first flushes what is buffered, so reads see earlier writes.
 */

export type SQLValue = string | number | null | boolean | Uint8Array | undefined;

interface HranaValue { type: 'null' | 'integer' | 'float' | 'text' | 'blob'; value?: string | number; base64?: string }
interface HranaStmt { sql: string; args?: HranaValue[] }
interface HranaResult {
  cols: { name: string | null }[];
  rows: HranaValue[][];
  affected_row_count: number;
  last_insert_rowid: string | number | null;
}

export interface RemoteConfig { url: string; authToken: string; fetchImpl?: typeof fetch; timeoutMs?: number }

export class RemoteDatabaseError extends Error {}

/** libsql://name-org.turso.io → https://name-org.turso.io (the HTTP API host). */
export function toHttpUrl(url: string): string {
  return url.trim().replace(/^libsql:\/\//i, 'https://').replace(/^wss?:\/\//i, 'https://').replace(/\/+$/, '');
}

function encode(v: SQLValue): HranaValue {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
  if (typeof v === 'number') {
    if (!isFinite(v)) return { type: 'null' };
    return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: v };
  }
  if (v instanceof Uint8Array) {
    let s = '';
    v.forEach(b => { s += String.fromCharCode(b); });
    return { type: 'blob', base64: btoa(s) };
  }
  return { type: 'text', value: String(v) };
}

function decode(v: HranaValue): unknown {
  switch (v.type) {
    case 'null': return null;
    case 'integer': return Number(v.value);
    case 'float': return typeof v.value === 'number' ? v.value : Number(v.value);
    case 'blob': return v.base64 ?? null;
    default: return v.value ?? null;
  }
}

function toRows<T>(r: HranaResult): T[] {
  const names = r.cols.map((c, i) => c.name ?? `col${i}`);
  return r.rows.map(row => {
    const o: Record<string, unknown> = {};
    row.forEach((cell, i) => { o[names[i]] = decode(cell); });
    return o as T;
  });
}

/** Splits a multi-statement script on top-level semicolons (ignores ; inside quotes and -- comments). */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      cur += '\n';
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; cur += ch; continue; }
    if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const TX = /^\s*(BEGIN|COMMIT|END|ROLLBACK)\b/i;
// Local-file settings that mean nothing on a hosted database.
const LOCAL_PRAGMA = /^\s*PRAGMA\s+(journal_mode|foreign_keys|synchronous)\b/i;
const TABLE_INFO = /^\s*PRAGMA\s+table_info\s*\(\s*["'`]?(\w+)["'`]?\s*\)\s*;?\s*$/i;

export class TursoDatabase {
  private readonly endpoint: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private tx: HranaStmt[] | null = null;

  constructor(cfg: RemoteConfig) {
    this.endpoint = `${toHttpUrl(cfg.url)}/v2/pipeline`;
    this.token = cfg.authToken.trim();
    this.fetchImpl = cfg.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
    this.timeoutMs = cfg.timeoutMs ?? 20000;
  }

  /** Sends statements in one HTTP request and returns one result per statement. */
  private async pipeline(stmts: HranaStmt[]): Promise<HranaResult[]> {
    if (stmts.length === 0) return [];
    const body = JSON.stringify({
      requests: [...stmts.map(stmt => ({ type: 'execute', stmt })), { type: 'close' }],
    });
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), this.timeoutMs) : null;
    let res: Response;
    try {
      res = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body,
        signal: ctrl?.signal,
      });
    } catch (e) {
      throw new RemoteDatabaseError(
        `Can't reach the online database. Check your internet connection. (${(e as Error).message})`);
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const hint = res.status === 401 || res.status === 403
        ? ' The database token is wrong or expired — see guide.html → Shared online database.' : '';
      throw new RemoteDatabaseError(`Online database error ${res.status}.${hint} ${text.slice(0, 200)}`);
    }
    const json = await res.json() as { results: { type: string; response?: { result: HranaResult }; error?: { message: string } }[] };
    return stmts.map((s, i) => {
      const r = json.results[i];
      if (!r || r.type !== 'ok' || !r.response) {
        throw new RemoteDatabaseError(r?.error?.message ?? `Statement failed: ${s.sql.slice(0, 80)}`);
      }
      return r.response.result;
    });
  }

  private stmt(sql: string, params?: SQLValue[] | SQLValue): HranaStmt {
    const list = params === undefined ? [] : Array.isArray(params) ? params : [params];
    return { sql, args: list.map(encode) };
  }

  /** Inside a transaction, writes are buffered; send them before anything that reads. */
  private async flushBuffered(): Promise<void> {
    if (!this.tx || this.tx.length === 0) return;
    const pending = this.tx;
    this.tx = [];
    await this.pipeline([{ sql: 'BEGIN' }, ...pending, { sql: 'COMMIT' }]);
  }

  async getAllAsync<T>(sql: string, params?: SQLValue[] | SQLValue): Promise<T[]> {
    const info = sql.match(TABLE_INFO);
    if (info) {
      // PRAGMA table_info → read the column names from an empty SELECT instead (works on any host).
      const [r] = await this.pipeline([{ sql: `SELECT * FROM "${info[1]}" LIMIT 0` }]);
      return r.cols.map((c, cid) => ({ cid, name: c.name })) as T[];
    }
    await this.flushBuffered();
    const [r] = await this.pipeline([this.stmt(sql, params)]);
    return toRows<T>(r);
  }

  async getFirstAsync<T>(sql: string, params?: SQLValue[] | SQLValue): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, params);
    return rows[0] ?? null;
  }

  async runAsync(sql: string, params?: SQLValue[] | SQLValue): Promise<{ lastInsertRowId: number; changes: number }> {
    if (this.tx) {
      this.tx.push(this.stmt(sql, params));
      return { lastInsertRowId: 0, changes: 0 };
    }
    const [r] = await this.pipeline([this.stmt(sql, params)]);
    return { lastInsertRowId: Number(r.last_insert_rowid ?? 0), changes: r.affected_row_count };
  }

  async execAsync(sql: string): Promise<void> {
    const stmts = splitStatements(sql).filter(s => !LOCAL_PRAGMA.test(s));
    const batch: HranaStmt[] = [];
    for (const s of stmts) {
      const m = s.match(TX);
      if (!m) {
        if (this.tx) this.tx.push({ sql: s }); else batch.push({ sql: s });
        continue;
      }
      if (batch.length) await this.pipeline(batch.splice(0));
      const word = m[1].toUpperCase();
      if (word === 'BEGIN') this.tx = [];
      else if (word === 'ROLLBACK') this.tx = null;           // nothing was sent yet, so nothing to undo
      else { const pending = this.tx ?? []; this.tx = null;    // COMMIT / END
        if (pending.length) await this.pipeline([{ sql: 'BEGIN' }, ...pending, { sql: 'COMMIT' }]); }
    }
    if (batch.length) await this.pipeline(batch);
  }
}

/** Reads the Turso settings from EXPO_PUBLIC_* (inlined at build time). Null = use the on-device database. */
export function remoteConfigFromEnv(): RemoteConfig | null {
  const url = (process.env.EXPO_PUBLIC_TURSO_DATABASE_URL ?? '').trim();
  const authToken = (process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN ?? '').trim();
  return url && authToken ? { url, authToken } : null;
}
