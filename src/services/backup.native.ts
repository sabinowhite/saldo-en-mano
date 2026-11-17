import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync, getRandomBytesAsync, randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { flushDrive } from './drive';
import type { FinanceState } from '../domain/finance';
import { openBackup, sealBackup } from '../storage/backup-codec';
const options = { keychainService: 'com.sabinowhite.saldoenmano.backups', keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const KEY = 'saldo.backup.key'; const ENABLED = 'saldo.backup.enabled'; const LAST = 'saldo.backup.last';
const aad = new TextEncoder().encode('saldo-en-mano.backup.v1');
const cipher = {
  async seal(plaintext: string, hex: string) {
    const key = await AESEncryptionKey.import(hex, 'hex');
    const sealed = await aesEncryptAsync(new TextEncoder().encode(plaintext), key, { additionalData: aad, nonce: { length: 12 }, tagLength: 16 });
    return sealed.combined('base64');
  },
  async open(document: string, hex: string) {
    const key = await AESEncryptionKey.import(hex, 'hex');
    const bytes = await aesDecryptAsync(AESSealedData.fromCombined(document, { ivLength: 12, tagLength: 16 }), key, { additionalData: aad, output: 'bytes' });
    return new TextDecoder().decode(bytes);
  },
};
export async function recoveryKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY, options);
  if (existing) return existing;
  const key = Array.from(await getRandomBytesAsync(32), v => v.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY, key, options); return key;
}
export async function enableBackups(): Promise<void> { await recoveryKey(); await SecureStore.setItemAsync(ENABLED, 'true', options); }
export async function backupStatus(): Promise<{ enabled: boolean; last: string | null }> { return { enabled: await SecureStore.getItemAsync(ENABLED, options) === 'true', last: await SecureStore.getItemAsync(LAST, options) }; }
let writing: Promise<void> = Promise.resolve();
export function automaticBackup(state: FinanceState): Promise<void> {
  const task = writing.then(async () => {
    if (!(await backupStatus()).enabled) return;
    const directory = new Directory(Paths.document, 'encrypted-backups');
    directory.create({ idempotent: true, intermediates: true });
    const stamp = new Date().toISOString();
    const filename = `saldo-${Date.now()}-${randomUUID()}.smb`;
    const file = new File(directory, filename + '.pending');
    await file.write(await sealBackup(state, await recoveryKey(), cipher, stamp));
    file.move(new File(directory, filename));
    // Remove old versions only after a new encrypted file has been written.
    const copies = directory.list().filter((f): f is File => f instanceof File && f.name.endsWith('.smb')).sort((a, b) => b.name.localeCompare(a.name));
    copies.slice(10).forEach(copy => copy.delete());
    await SecureStore.setItemAsync(LAST, stamp, options);
    await flushDrive().catch(() => undefined); // Local success and cloud acknowledgement are tracked separately.
  });
  writing = task.catch(() => undefined); return task;
}
export async function exportBackup(state: FinanceState): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('No se encontró una aplicación para guardar o compartir el respaldo.');
  const file = new File(Paths.cache, 'saldo-en-mano-respaldo.smb');
  await file.write(await sealBackup(state, await recoveryKey(), cipher));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', dialogTitle: 'Guardar respaldo cifrado de Saldo en Mano', UTI: 'public.data' });
}
export async function pickBackup(key: string): Promise<{ state: FinanceState; createdAt: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const file = new File(result.assets[0].uri);
  if (file.size > 50000000) throw new Error('El archivo excede el tamaño permitido.');
  return openBackup(await file.text(), key, cipher);
}

export async function openBackupDocument(document: string, key: string): Promise<{ state: FinanceState; createdAt: string }> { return openBackup(document, key, cipher); }
