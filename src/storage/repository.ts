import { financeReducer } from '../domain/finance.ts';
import type { Action, FinanceState } from '../domain/finance.ts';
import { StorageError } from './errors.ts';
import { decodeState, encodeState } from './validation.ts';
export interface SqlConnection {
  execAsync: (sql: string) => Promise<void>;
  getFirstAsync: <T>(sql: string, ...params: (string | number)[]) => Promise<T | null>;
  runAsync: (sql: string, ...params: (string | number)[]) => Promise<unknown>;
}
export interface FinanceRepository {
  load: () => Promise<FinanceState | null>;
  initialize: (state: FinanceState) => Promise<FinanceState>;
  apply: (action: Action) => Promise<FinanceState>;
  restore: (state: FinanceState) => Promise<FinanceState>;
}
export const DATABASE_VERSION = 2;
export async function migrateDatabase(db: SqlConnection) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version;
  if (!Number.isInteger(version) || version! < 0) throw new StorageError('corrupt-data');
  if (version! > DATABASE_VERSION) throw new StorageError('future-schema');
  if (version === DATABASE_VERSION) return;
  if (version === 0) {
    const oldTable = await db.getFirstAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1");
    if (oldTable) throw new StorageError('corrupt-data');
  }
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    if (version === 0) {
      await db.execAsync('CREATE TABLE finance_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, revision INTEGER NOT NULL CHECK (revision >= 1))');
      await db.execAsync('PRAGMA user_version = 1');
    }
    await db.execAsync('CREATE TABLE finance_restore_history (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, restored_at TEXT NOT NULL)');
    await db.execAsync('PRAGMA user_version = 2');
    await db.execAsync('COMMIT');
  } catch (error) {
    try { await db.execAsync('ROLLBACK'); } catch { /* Preserve original failure. */ }
    throw error;
  }
}
export function createRepository(db: SqlConnection): FinanceRepository {
  let queue: Promise<unknown> = Promise.resolve();
  function serialized<T>(task: () => Promise<T>): Promise<T> {
    const pending = queue.then(task);
    queue = pending.catch(() => undefined);
    return pending;
  }
  async function read() {
    const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM finance_state WHERE id = 1');
    return row ? decodeState(row.payload) : null;
  }
  async function atomic<T>(task: () => Promise<T>): Promise<T> {
    // One private keyed connection, all access serialized. Expo's exclusive helper
    // can create another connection: SQLCipher requires a key on every connection.
    await db.execAsync('BEGIN IMMEDIATE');
    try {
      const result = await task();
      await db.execAsync('COMMIT');
      return result;
    } catch (error) {
      try { await db.execAsync('ROLLBACK'); } catch { /* Keep the original error. */ }
      throw error;
    }
  }
  return {
    restore: state => serialized(() => atomic(async () => {
      const payload = encodeState(state);
      await db.runAsync('INSERT INTO finance_restore_history (payload, restored_at) SELECT payload, ? FROM finance_state WHERE id = 1', new Date().toISOString());
      await db.runAsync('INSERT INTO finance_state (id, payload, revision) VALUES (1, ?, 1) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, revision = finance_state.revision + 1', payload);
      return decodeState(payload);
    })),
    load: () => serialized(read),
    initialize: state => serialized(() => atomic(async () => {
      const payload = encodeState(state);
      if (await read()) throw new StorageError('already-initialized');
      await db.runAsync('INSERT INTO finance_state (id, payload, revision) VALUES (1, ?, 1)', payload);
      return decodeState(payload);
    })),
    apply: action => serialized(() => atomic(async () => {
      const state = await read();
      if (!state) throw new StorageError('corrupt-data');
      const next = financeReducer(state, action);
      const payload = encodeState(next);
      if (payload === encodeState(state)) return state;
      await db.runAsync('UPDATE finance_state SET payload = ?, revision = revision + 1 WHERE id = 1', payload);
      return decodeState(payload);
    })),
  };
}
