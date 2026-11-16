// Test-only stand-in for expo-sqlite backed by Node's built-in SQLite, so tests run the real migrations and SQL.
import { DatabaseSync } from 'node:sqlite';

type Params = (string | number | null)[];

export function openFakeDatabase() {
  const d = new DatabaseSync(':memory:');
  return {
    execAsync: async (sql: string) => { d.exec(sql); },
    getAllAsync: async <T>(sql: string, params: Params = []) => d.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T>(sql: string, params: Params = []) => (d.prepare(sql).get(...params) as T) ?? null,
    runAsync: async (sql: string, params: Params = []) => d.prepare(sql).run(...params),
  };
}

/** Clears the app's cached DB promise so each test gets a fresh database. */
export function resetDatabase() {
  delete (globalThis as { __kalawguide_db_promise?: unknown }).__kalawguide_db_promise;
}
