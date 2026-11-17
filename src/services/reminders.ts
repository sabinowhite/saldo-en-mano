import type { FinanceState } from '../domain/finance';
export async function remindersEnabled(): Promise<boolean> { return false; }
export async function setRemindersEnabled(_enabled: boolean): Promise<void> { throw new Error('Los recordatorios del sistema están disponibles en la aplicación nativa.'); }
export async function syncReminders(_state: FinanceState): Promise<void> {}
