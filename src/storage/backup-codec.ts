import type { FinanceState } from '../domain/finance.ts';
import { decodeState, encodeState } from './validation.ts';
export interface BackupCipher { seal: (plaintext: string, key: string) => Promise<string>; open: (sealed: string, key: string) => Promise<string> }
export function normalizeRecoveryKey(value: string): string { return value.replace(/[\s-]/g, '').toLowerCase(); }
export function checkRecoveryKey(value: string): string {
  const key = normalizeRecoveryKey(value);
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('La clave debe contener los 64 caracteres del código de recuperación.');
  return key;
}
export async function sealBackup(state: FinanceState, recoveryKey: string, cipher: BackupCipher, createdAt = new Date().toISOString()): Promise<string> {
  const key = checkRecoveryKey(recoveryKey);
  const plaintext = JSON.stringify({ createdAt, state: JSON.parse(encodeState(state)) });
  return JSON.stringify({ format: 'saldo-en-mano', version: 1, cipher: 'AES-256-GCM', sealed: await cipher.seal(plaintext, key) });
}
export async function openBackup(document: string, recoveryKey: string, cipher: BackupCipher): Promise<{ state: FinanceState; createdAt: string }> {
  const key = checkRecoveryKey(recoveryKey);
  try {
    if (document.length > 50000000) throw new Error('large');
    const envelope = JSON.parse(document);
    if (envelope.format !== 'saldo-en-mano' || envelope.version !== 1 || envelope.cipher !== 'AES-256-GCM' || typeof envelope.sealed !== 'string' || envelope.sealed.length > 49000000) throw new Error('format');
    const payload = JSON.parse(await cipher.open(envelope.sealed, key));
    if (typeof payload.createdAt !== 'string' || !Number.isFinite(Date.parse(payload.createdAt))) throw new Error('date');
    return { state: decodeState(JSON.stringify(payload.state)), createdAt: payload.createdAt };
  } catch { throw new Error('No se pudo abrir el respaldo. Revisa la clave, la versión del archivo y que no esté dañado. No se modificaron tus datos.'); }
}
