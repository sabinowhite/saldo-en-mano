import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInitialState } from '../src/domain/setup.ts';
import { demoState, available, financeReducer } from '../src/domain/finance.ts';
import { createRepository, migrateDatabase } from '../src/storage/repository.ts';
import type { SqlConnection } from '../src/storage/repository.ts';
import { loadDatabaseKey, assertCipherAvailable } from '../src/storage/key.ts';
import { decodeState, encodeState } from '../src/storage/validation.ts';
import { StorageError } from '../src/storage/errors.ts';
const today = '2026-11-17';
const input = { date: today, bankCents: 1100000, cashCents: 252000, settings: { salaryCents: 1400000, frequency: 'fortnightly' as const, offeringPercent: 5 } };
function driver(db: DatabaseSync): SqlConnection {
  return {
    execAsync: async sql => { db.exec(sql); },
    getFirstAsync: async <T>(sql: string, ...params: (string | number)[]) => (db.prepare(sql).get(...params) as T | undefined) ?? null,
    runAsync: async (sql, ...params) => db.prepare(sql).run(...params),
  };
}
const hasCode = (code: string) => (error: unknown) => error instanceof StorageError && error.code === code;

test('configuración inicial parte de saldos actuales, sin duplicar salario o crear movimientos ficticios', () => {
  const state = createInitialState(input, today);
  assert.equal(state.balances.bank, 1100000);
  assert.equal(state.balances.cash, 252000);
  assert.equal(available(state), 1352000);
  assert.deepEqual(state.entries, []);
  assert.deepEqual(state.reserves, []);
  assert.deepEqual(state.debts, []);
  assert.throws(() => createInitialState({ ...input, date: '2026-11-18' }, today));
  assert.throws(() => createInitialState({ ...input, cashCents: -1 }, today));
  assert.throws(() => createInitialState({ ...input, settings: { ...input.settings, offeringPercent: 0.001 } }, today));
});
test('no permite registrar movimientos previos a los saldos iniciales', () => {
  const state = createInitialState(input, today);
  assert.throws(() => financeReducer(state, { type: 'entry', entry: { id: 'old', kind: 'expense', concept: 'Pasado', cents: 100, account: 'cash', date: '2026-11-16' } }));
  assert.equal(state.entries.length, 0);
});
test('SQLCipher ausente nunca se interpreta como cifrado habilitado', () => {
  assert.throws(() => assertCipherAvailable(null), hasCode('encryption-unavailable'));
  assert.throws(() => assertCipherAvailable({ cipher_version: '' }), hasCode('encryption-unavailable'));
  assert.doesNotThrow(() => assertCipherAvailable({ cipher_version: '4.17.0' }));
});
test('base existente sin clave falla antes de generar o reemplazar una clave', async () => {
  let writes = 0; let randomCalls = 0;
  await assert.rejects(loadDatabaseKey({ get: async () => null, set: async () => { writes++; } }, true, async () => { randomCalls++; return new Uint8Array(32); }), hasCode('missing-key'));
  assert.equal(writes, 0); assert.equal(randomCalls, 0);
});
test('clave existente se reutiliza en cada apertura y clave corrupta no se reemplaza', async () => {
  const key = 'ab'.repeat(32); let writes = 0;
  const vault = { get: async () => key, set: async () => { writes++; } };
  assert.equal(await loadDatabaseKey(vault, true, async () => { throw new Error('No generar'); }), key);
  assert.equal(writes, 0);
  await assert.rejects(loadDatabaseKey({ ...vault, get: async () => 'invalid' }, true, async () => new Uint8Array(32)), hasCode('invalid-key'));
});
test('primera clave se guarda antes de poder utilizarla; errores de almacén no se ignoran', async () => {
  let stored = '';
  const key = await loadDatabaseKey({ get: async () => null, set: async value => { stored = value; } }, false, async () => new Uint8Array(32).fill(0xa5));
  assert.equal(key, 'a5'.repeat(32)); assert.equal(stored, key);
  await assert.rejects(loadDatabaseKey({ get: async () => null, set: async () => { throw new Error('locked'); } }, false, async () => new Uint8Array(32)));
});
test('validación rechaza JSON inválido, saldos inconsistentes, IDs repetidos y campos corruptos', () => {
  assert.throws(() => decodeState('{'), hasCode('corrupt-data'));
  const state = demoState(today);
  assert.deepEqual(decodeState(encodeState(state)), state);
  assert.throws(() => decodeState(JSON.stringify({ ...state, balances: { ...state.balances, bank: 1 } })), hasCode('corrupt-data'));
  assert.throws(() => decodeState(JSON.stringify({ ...state, entries: [...state.entries, state.entries[0]] })), hasCode('corrupt-data'));
  assert.throws(() => decodeState(JSON.stringify({ ...state, reserves: [{ ...state.reserves[0], delivered: 'yes' }] })), hasCode('corrupt-data'));
});
test('migración es repetible y no reinicializa registros existentes', async () => {
  const db = new DatabaseSync(':memory:'); const sql = driver(db);
  try {
    await migrateDatabase(sql);
    const repo = createRepository(sql);
    await repo.initialize(createInitialState(input, today));
    await migrateDatabase(sql);
    assert.equal((await repo.load())?.balances.bank, input.bankCents);
    await assert.rejects(repo.initialize(demoState(today)), hasCode('already-initialized'));
    assert.equal((await repo.load())?.entries.length, 0);
  } finally { db.close(); }
});
test('versión futura y tablas desconocidas no se borran ni migran silenciosamente', async () => {
  const future = new DatabaseSync(':memory:'); const unknown = new DatabaseSync(':memory:');
  try {
    future.exec('PRAGMA user_version = 2');
    await assert.rejects(migrateDatabase(driver(future)), hasCode('future-schema'));
    assert.equal(future.prepare('PRAGMA user_version').get()?.user_version, 2);
    unknown.exec('CREATE TABLE precious (value TEXT); INSERT INTO precious VALUES (\'keep\')');
    await assert.rejects(migrateDatabase(driver(unknown)), hasCode('corrupt-data'));
    assert.equal(unknown.prepare('SELECT value FROM precious').get()?.value, 'keep');
  } finally { future.close(); unknown.close(); }
});
test('fallo de migración revierte esquema y versión de forma atómica', async () => {
  const db = new DatabaseSync(':memory:'); const sql = driver(db);
  try {
    await assert.rejects(migrateDatabase({ ...sql, execAsync: async command => { if (command === 'PRAGMA user_version = 1') throw new Error('disk failure'); await sql.execAsync(command); } }));
    assert.equal(db.prepare('PRAGMA user_version').get()?.user_version, 0);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name = 'finance_state'").get(), undefined);
  } finally { db.close(); }
});
test('reiniciar el repositorio conserva movimientos y evita recontar el mismo ID', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'saldo-test-')); const file = join(folder, 'finance.db');
  let db = new DatabaseSync(file);
  try {
    await migrateDatabase(driver(db));
    const repo = createRepository(driver(db));
    await repo.initialize(createInitialState(input, today));
    const action = { type: 'entry' as const, entry: { id: 'stable-id', kind: 'expense' as const, account: 'cash' as const, concept: 'Compra', cents: 30000, date: today } };
    const committed = await repo.apply(action);
    db.close(); db = new DatabaseSync(file);
    await migrateDatabase(driver(db));
    const reopened = createRepository(driver(db));
    assert.deepEqual(await reopened.load(), committed);
    assert.deepEqual(await reopened.apply(action), committed);
  } finally { db.close(); rmSync(folder, { recursive: true, force: true }); }
});
test('escritura fallida revierte banco, deuda y movimiento juntos; reintentar funciona', async () => {
  const db = new DatabaseSync(':memory:'); const sql = driver(db); let fail = false;
  try {
    await migrateDatabase(sql);
    const repo = createRepository({ ...sql, runAsync: async (command, ...params) => { const result = await sql.runAsync(command, ...params); if (fail) { fail = false; throw new Error('disk error after write'); } return result; } });
    await repo.initialize(demoState(today));
    const before = await repo.load(); fail = true;
    const action = { type: 'debt' as const, id: 'music', entryId: 'abono', account: 'bank' as const, cents: 10000, date: today };
    await assert.rejects(repo.apply(action));
    assert.deepEqual(await repo.load(), before);
    const after = await repo.apply(action);
    assert.equal(after.debts[0].cents, 40000);
    assert.equal(after.balances.bank, 1090000);
    assert.equal(after.entries.length, before!.entries.length + 1);
  } finally { db.close(); }
});
test('confirmaciones simultáneas se serializan y no pierden actualizaciones', async () => {
  const db = new DatabaseSync(':memory:'); const sql = driver(db);
  try {
    await migrateDatabase(sql); const repo = createRepository(sql);
    await repo.initialize(createInitialState(input, today));
    const make = (id: string) => ({ type: 'entry' as const, entry: { id, kind: 'expense' as const, account: 'cash' as const, concept: id, cents: 10000, date: today } });
    await Promise.all([repo.apply(make('one')), repo.apply(make('two')), repo.apply(make('one'))]);
    const state = await repo.load();
    assert.equal(state?.entries.length, 2); assert.equal(state?.balances.cash, 232000);
  } finally { db.close(); }
});
test('payload corrupto se conserva para recuperación en lugar de reemplazarse por datos vacíos', async () => {
  const db = new DatabaseSync(':memory:'); const sql = driver(db);
  try {
    await migrateDatabase(sql); db.prepare('INSERT INTO finance_state VALUES (1, ?, 1)').run('{broken');
    const repo = createRepository(sql);
    await assert.rejects(repo.load(), hasCode('corrupt-data'));
    await assert.rejects(repo.initialize(createInitialState(input, today)), hasCode('corrupt-data'));
    assert.equal(db.prepare('SELECT payload FROM finance_state').get()?.payload, '{broken');
  } finally { db.close(); }
});
