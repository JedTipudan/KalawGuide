// The shared online database, tested end to end against a stand-in Turso server: it speaks the
// real Hrana-over-HTTP JSON format (POST /v2/pipeline, typed args/values, BEGIN … COMMIT) and is
// backed by Node's SQLite. Two "devices" share it, like two phones using the same Turso database.
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(() => { throw new Error('device DB must not open in online mode'); }) }));
// Each "device" has its own private storage (sessions, legacy hashes) — only the database is shared.
jest.mock('../../utils/storage', () => {
  const m = new Map<string, string>();
  return { storage: {
    getItem: async (k: string) => m.get(k) ?? null,
    setItem: async (k: string, v: string) => { m.set(k, v); },
    deleteItem: async (k: string) => { m.delete(k); },
  } };
});
jest.mock('expo-crypto', () => {
  const { createHash, randomBytes, randomUUID } = jest.requireActual('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    randomUUID: () => randomUUID(),
    getRandomBytes: (n: number) => new Uint8Array(randomBytes(n)),
    digestStringAsync: async (_alg: string, s: string) => createHash('sha256').update(s).digest('hex'),
  };
});

import { DatabaseSync } from 'node:sqlite';
import { OfflineError, TursoDatabase, splitStatements, toHttpUrl } from './tursoDatabase';

type HV = { type: string; value?: string | number; base64?: string };

/** Minimal Turso HTTP server: one shared SQLite database, many clients. */
function fakeTurso(token = 'secret') {
  const db = new DatabaseSync(':memory:');
  const requests: { sqls: string[] }[] = [];
  const toJs = (a: HV) => a.type === 'null' ? null : a.type === 'integer' ? Number(a.value) : a.type === 'float' ? Number(a.value) : String(a.value);
  const toHV = (v: unknown): HV => v === null || v === undefined ? { type: 'null' }
    : typeof v === 'number' || typeof v === 'bigint' ? (Number.isInteger(Number(v)) ? { type: 'integer', value: String(v) } : { type: 'float', value: Number(v) })
    : { type: 'text', value: String(v) };
  const fetchImpl = (async (url: string, init: RequestInit) => {
    expect(url).toBe('https://kalaw-test.turso.io/v2/pipeline');
    if ((init.headers as Record<string, string>).Authorization !== `Bearer ${token}`) {
      return { ok: false, status: 401, text: async () => 'unauthorized', json: async () => ({}) } as unknown as Response;
    }
    const body = JSON.parse(String(init.body)) as { requests: { type: string; stmt?: { sql: string; args?: HV[] } }[] };
    requests.push({ sqls: body.requests.filter(r => r.stmt).map(r => r.stmt!.sql) });
    const results = body.requests.map(r => {
      if (r.type === 'close') return { type: 'ok', response: { type: 'close' } };
      try {
        const { sql, args = [] } = r.stmt!;
        const st = db.prepare(sql);
        const params = args.map(toJs);
        if (/^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql) || st.columns().length > 0) {
          const rows = st.all(...params) as Record<string, unknown>[];
          const cols = st.columns().map(c => ({ name: c.name, decltype: null }));
          return { type: 'ok', response: { type: 'execute', result: {
            cols, rows: rows.map(row => cols.map(c => toHV(row[c.name]))), affected_row_count: 0, last_insert_rowid: null } } };
        }
        const info = st.run(...params);
        return { type: 'ok', response: { type: 'execute', result: {
          cols: [], rows: [], affected_row_count: Number(info.changes), last_insert_rowid: String(info.lastInsertRowid) } } };
      } catch (e) {
        return { type: 'error', error: { message: (e as Error).message } };
      }
    });
    return { ok: true, status: 200, json: async () => ({ baton: null, base_url: null, results }) } as unknown as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, requests };
}

describe('TursoDatabase (unit)', () => {
  it('maps libsql:// to the HTTP API host and splits scripts safely', () => {
    expect(toHttpUrl('libsql://kalaw-test.turso.io/')).toBe('https://kalaw-test.turso.io');
    expect(splitStatements("CREATE TABLE a(x); -- note; here\nINSERT INTO a VALUES ('x;y');")).toEqual(
      ['CREATE TABLE a(x)', "INSERT INTO a VALUES ('x;y')"]);
  });

  it('round-trips typed values and reports a bad token clearly', async () => {
    const server = fakeTurso();
    const db = new TursoDatabase({ url: 'libsql://kalaw-test.turso.io', authToken: 'secret', fetchImpl: server.fetchImpl });
    await db.execAsync('CREATE TABLE t (i INTEGER, f REAL, s TEXT, n TEXT);');
    const res = await db.runAsync('INSERT INTO t VALUES (?, ?, ?, ?)', [42, 1.5, 'Mati ₱', null]);
    expect(res.changes).toBe(1);
    expect(await db.getFirstAsync('SELECT * FROM t')).toEqual({ i: 42, f: 1.5, s: 'Mati ₱', n: null });

    const bad = new TursoDatabase({ url: 'https://kalaw-test.turso.io', authToken: 'wrong', fetchImpl: server.fetchImpl });
    await expect(bad.getAllAsync('SELECT 1')).rejects.toThrow(/token is wrong/);
  });

  it('sends a whole BEGIN … COMMIT block in one request, flushing before reads', async () => {
    const server = fakeTurso();
    const db = new TursoDatabase({ url: 'https://kalaw-test.turso.io', authToken: 'secret', fetchImpl: server.fetchImpl });
    await db.execAsync('CREATE TABLE t (v INTEGER);');
    server.requests.length = 0;
    await db.execAsync('BEGIN;');
    for (let i = 0; i < 50; i++) await db.runAsync('INSERT INTO t VALUES (?)', [i]);
    expect(server.requests).toHaveLength(0); // buffered
    expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM t'))!.n).toBe(50); // read flushes first
    await db.runAsync('INSERT INTO t VALUES (?)', [99]);
    await db.execAsync('COMMIT;');
    expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM t'))!.n).toBe(51);
    expect(server.requests[0].sqls[0]).toBe('BEGIN');
    expect(server.requests[0].sqls).toHaveLength(52);
  });

  it('answers PRAGMA table_info without needing PRAGMA support on the host', async () => {
    const server = fakeTurso();
    const db = new TursoDatabase({ url: 'https://kalaw-test.turso.io', authToken: 'secret', fetchImpl: server.fetchImpl });
    await db.execAsync('CREATE TABLE users (id TEXT, email TEXT);');
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(users)');
    expect(cols.map(c => c.name)).toEqual(['id', 'email']);
  });

  it('with no internet, answers reads from the last saved copy', async () => {
    const server = fakeTurso();
    const saved = new Map<string, string>();
    const cache = { get: async (k: string) => saved.get(k) ?? null, set: async (k: string, v: string) => { saved.set(k, v); } };
    let online = true;
    const fetchImpl = ((...a: Parameters<typeof fetch>) =>
      online ? server.fetchImpl(...a) : Promise.reject(new TypeError('Network request failed'))) as typeof fetch;
    const db = new TursoDatabase({ url: 'https://kalaw-test.turso.io', authToken: 'secret', fetchImpl, cache });
    await db.execAsync("CREATE TABLE destinations (id TEXT, name TEXT); INSERT INTO destinations VALUES ('d1', 'Kalaw Falls');");
    const live = await db.getAllAsync<{ name: string }>('SELECT name FROM destinations WHERE id = ?', ['d1']);
    await new Promise(r => setTimeout(r, 0));

    online = false;
    expect(await db.getAllAsync('SELECT name FROM destinations WHERE id = ?', ['d1'])).toEqual(live);
    await expect(db.getAllAsync('SELECT id FROM destinations')).rejects.toThrow(OfflineError);
    await expect(db.runAsync("INSERT INTO destinations VALUES ('d2', 'x')")).rejects.toThrow(OfflineError);
  });
});

describe('Shared online database: the instructor scenario across devices', () => {
  const ENV = { ...process.env };
  afterEach(() => { process.env = { ...ENV }; jest.resetModules(); });

  /** Loads a fresh copy of the app's modules — one "device" — pointed at the shared server. */
  function device(server: ReturnType<typeof fakeTurso>) {
    let mods!: {
      init: typeof import('../migrations/init');
      seeds: typeof import('../seeds/index');
      auth: typeof import('../../services/auth/authService');
    };
    jest.isolateModules(() => {
      process.env.EXPO_PUBLIC_TURSO_DATABASE_URL = 'libsql://kalaw-test.turso.io';
      process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN = 'secret';
      (globalThis as { fetch: typeof fetch }).fetch = server.fetchImpl;
      delete (globalThis as { __kalawguide_db_promise?: unknown }).__kalawguide_db_promise;
      mods = {
        init: require('../migrations/init'),
        seeds: require('../seeds/index'),
        auth: require('../../services/auth/authService'),
      };
    });
    const fresh = () => { delete (globalThis as { __kalawguide_db_promise?: unknown }).__kalawguide_db_promise; };
    return { ...mods, fresh };
  }

  it('business registers on phone A, admin approves on laptop B, tourist sees it on phone C', async () => {
    const server = fakeTurso();

    // Phone A: first launch seeds the shared database; a business owner registers and submits.
    const A = device(server);
    expect(A.init.DATABASE_MODE).toBe('online');
    await A.seeds.seedDatabase();
    const owner = await A.auth.registerWithEmail({ email: 'owner@test.ph', password: 'pass1234', displayName: 'Owner', role: 'business_owner' });
    let db = await A.init.getDatabase();
    await db.runAsync(
      `INSERT INTO businesses (id, owner_id, name, description, category, address, verification_status, is_active, created_at, updated_at)
       VALUES ('biz_new', ?, 'Instructor Test Resort', 'Made during the demo', 'accommodation', 'Dahican, Mati', 'pending', 1, 'x', 'x')`,
      [owner.user.id]);
    await db.runAsync("INSERT INTO business_documents (id, business_id, document_type, label, uri, mime_type, uploaded_at) VALUES ('d1','biz_new','permit','Permit','data:image/jpeg;base64,AAAA','image/jpeg','x')");

    // Laptop B: the default admin signs in (password stored in the database) and approves.
    const B = device(server);
    B.fresh();
    await B.seeds.seedDatabase();
    const admin = await B.auth.signInWithEmail({ email: 'admin@kalawguide.app', password: 'admin2024!' });
    expect(admin.user.role).toBe('admin');
    db = await B.init.getDatabase();
    const doc = await db.getFirstAsync<{ uri: string }>("SELECT uri FROM business_documents WHERE business_id = 'biz_new'");
    expect(doc!.uri.startsWith('data:image/jpeg;base64,')).toBe(true); // the admin can see the uploaded document
    await db.runAsync("UPDATE businesses SET verification_status = 'approved' WHERE id = 'biz_new'");

    // Phone C: the owner can sign in here too, and a tourist sees the approved business.
    const C = device(server);
    C.fresh();
    await expect(C.auth.signInWithEmail({ email: 'owner@test.ph', password: 'pass1234' })).resolves.toBeTruthy();
    await expect(C.auth.signInWithEmail({ email: 'owner@test.ph', password: 'wrong' })).rejects.toThrow(/Incorrect password/);
    db = await C.init.getDatabase();
    const visible = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM businesses WHERE verification_status = 'approved' AND is_active = 1 AND name = 'Instructor Test Resort'");
    expect(visible).toHaveLength(1);

    // The shared seed ran once: one admin, one set of demo resorts.
    expect((await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE email = 'admin@kalawguide.app'"))!.n).toBe(1);
    expect((await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM businesses WHERE id LIKE 'seed_biz_%'"))!.n).toBe(13);
  });
});
