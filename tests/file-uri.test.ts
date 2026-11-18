import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseDirectoryUri } from '../src/storage/file-uri.ts';

test('la ruta nativa de SQLite en Android se convierte en un URI absoluto del mismo directorio', () => {
  const path = '/data/user/0/com.sabinowhite.saldoenmano/files/SQLite';
  const uri = databaseDirectoryUri(path);
  assert.equal(new URL(uri).protocol, 'file:');
  assert.equal(fileURLToPath(uri), path);
});

test('un URI iOS ya codificado conserva exactamente la ubicación', () => {
  const uri = 'file:///var/mobile/Containers/Data/Application/ABC/Documents/SQLite%20local';
  assert.equal(databaseDirectoryUri(uri), uri);
});

test('la conversión permite detectar archivos existentes sin perder espacios, acentos ni signos', () => {
  const directory = mkdtempSync(join(tmpdir(), 'saldo # á % '));
  try {
    const path = join(directory, 'saldo-en-mano.db');
    writeFileSync(path, 'fixture');
    const uri = databaseDirectoryUri(directory) + '/saldo-en-mano.db';
    assert.equal(existsSync(new URL(uri)), true);
    assert.equal(fileURLToPath(uri), path);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('rechaza rutas ambiguas antes de consultar archivos o generar claves', () => {
  for (const path of ['', 'SQLite', 'https://example.com/db', 'content://db']) {
    assert.throws(() => databaseDirectoryUri(path), { name: 'StorageError', code: 'unavailable' });
  }
});
