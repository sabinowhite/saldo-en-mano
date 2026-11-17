import { StorageError } from './errors.ts';
export interface KeyVault {
  get: () => Promise<string | null>;
  set: (value: string) => Promise<void>;
}
export async function loadDatabaseKey(vault: KeyVault, databaseExists: boolean, randomBytes: () => Promise<Uint8Array>): Promise<string> {
  const existing = await vault.get();
  if (existing !== null) {
    if (!/^[a-f0-9]{64}$/.test(existing)) throw new StorageError('invalid-key');
    return existing;
  }
  if (databaseExists) throw new StorageError('missing-key');
  const bytes = await randomBytes();
  if (bytes.length !== 32) throw new StorageError('invalid-key');
  const key = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
  await vault.set(key); // Fail before creating a database if secure key storage fails.
  return key;
}

export function assertCipherAvailable(row: { cipher_version: string } | null): void {
  if (!row || typeof row.cipher_version !== 'string' || !row.cipher_version.trim()) throw new StorageError('encryption-unavailable');
}
