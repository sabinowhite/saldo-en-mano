import type { FinanceState } from '../domain/finance';
export async function recoveryKey(): Promise<string> { throw new Error('El respaldo requiere la aplicación nativa.'); }
export async function enableBackups(): Promise<void> { throw new Error('El respaldo requiere la aplicación nativa.'); }
export async function backupStatus(): Promise<{ enabled: boolean; last: string | null }> { return { enabled: false, last: null }; }
export async function automaticBackup(_state: FinanceState): Promise<void> {}
export async function exportBackup(_state: FinanceState): Promise<void> { throw new Error('El respaldo requiere la aplicación nativa.'); }
export async function pickBackup(_key: string): Promise<{ state: FinanceState; createdAt: string } | null> { throw new Error('La recuperación requiere la aplicación nativa.'); }

export async function openBackupDocument(_document: string, _key: string): Promise<{ state: FinanceState; createdAt: string }> { throw new Error('La recuperación requiere la aplicación nativa.'); }
