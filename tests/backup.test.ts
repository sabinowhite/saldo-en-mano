import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { openBackup, sealBackup, normalizeRecoveryKey } from '../src/storage/backup-codec.ts';
import { demoState } from '../src/domain/finance.ts';
const key = 'ab'.repeat(32);
const aad = Buffer.from('saldo-en-mano.backup.v1');
const cipher = {
  async seal(text: string, hex: string) { const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', Buffer.from(hex, 'hex'), iv); c.setAAD(aad); return Buffer.concat([iv, c.update(text, 'utf8'), c.final(), c.getAuthTag()]).toString('base64'); },
  async open(sealed: string, hex: string) { const bytes = Buffer.from(sealed, 'base64'); const d = createDecipheriv('aes-256-gcm', Buffer.from(hex, 'hex'), bytes.subarray(0, 12)); d.setAAD(aad); d.setAuthTag(bytes.subarray(-16)); return Buffer.concat([d.update(bytes.subarray(12, -16)), d.final()]).toString('utf8'); },
};
test('respaldo autenticado recupera estado, caracteres españoles y fecha sin incluir clave o texto financiero', async () => {
  const state = demoState('2026-11-17'); state.entries[0].concept = 'Gasolina y café · Mérida';
  const document = await sealBackup(state, key, cipher, '2026-11-17T12:00:00.000Z');
  assert.equal(document.includes(key), false); assert.equal(document.includes('Gasolina'), false); assert.equal(document.includes('Mérida'), false);
  const recovered = await openBackup(document, key.toUpperCase().match(/.{1,4}/g)!.join(' '), cipher);
  assert.deepEqual(recovered.state, state); assert.equal(recovered.createdAt, '2026-11-17T12:00:00.000Z');
});
test('clave incorrecta, respaldo alterado o versión futura no producen estado restaurable', async () => {
  const document = await sealBackup(demoState('2026-11-17'), key, cipher);
  await assert.rejects(openBackup(document, 'cd'.repeat(32), cipher));
  const envelope = JSON.parse(document); const bytes = Buffer.from(envelope.sealed, 'base64'); bytes[20] ^= 1; envelope.sealed = bytes.toString('base64');
  await assert.rejects(openBackup(JSON.stringify(envelope), key, cipher));
  await assert.rejects(openBackup(JSON.stringify({ ...JSON.parse(document), version: 2 }), key, cipher));
  await assert.rejects(openBackup(document, 'contraseña corta', cipher));
  assert.equal(normalizeRecoveryKey('ABCD-abcd ABCD'), 'abcdabcdabcd');
});
