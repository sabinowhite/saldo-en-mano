import test from 'node:test';
import assert from 'node:assert/strict';
import { createDriveClient } from '../src/services/drive-client.ts';
test('Drive usa la carpeta privada de la app y transmite únicamente el documento cifrado', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const client = createDriveClient(async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(init?.method === 'POST' ? { id: 'new-backup' } : { files: [] }), { status: 200 }); });
  const document = JSON.stringify({ format: 'saldo-en-mano', version: 1, cipher: 'AES-256-GCM', sealed: 'encrypted-only' });
  assert.equal(await client.upload('saldo-123.smb', document), 'new-backup');
  assert.match(calls[0].url, /spaces=appDataFolder/);
  assert.match(String(calls[1].init?.body), /"parents":\["appDataFolder"\]/);
  assert.ok(String(calls[1].init?.body).includes(document));
  assert.equal(String(calls[1].init?.body).includes('accessToken'), false);
});
test('reintentar un respaldo ya confirmado no vuelve a crearlo', async () => {
  let writes = 0;
  const client = createDriveClient(async (_url, init) => { if (init?.method === 'POST') writes++; return new Response(JSON.stringify({ files: [{ id: 'existing', name: 'saldo-123.smb' }] })); });
  assert.equal(await client.upload('saldo-123.smb', '{}'), 'existing'); assert.equal(writes, 0);
});
test('sin confirmación de Drive no se presenta una subida como exitosa', async () => {
  const client = createDriveClient(async (_url, init) => new Response(JSON.stringify(init?.method === 'POST' ? {} : { files: [] }), { status: init?.method === 'POST' ? 503 : 200 }));
  await assert.rejects(client.upload('saldo-123.smb', '{}'));
});
