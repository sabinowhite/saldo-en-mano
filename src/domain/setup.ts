import { localDate, validDate } from './finance.ts';
import type { FinanceState, Settings } from './finance.ts';
export type InitialSetup = { date: string; bankCents: number; cashCents: number; settings: Settings };
export function validSettings(settings: Settings): boolean {
  return Number.isSafeInteger(settings.salaryCents) && settings.salaryCents > 0
    && Number.isFinite(settings.offeringPercent) && settings.offeringPercent >= 0 && settings.offeringPercent <= 100
    && Math.abs(settings.offeringPercent * 100 - Math.round(settings.offeringPercent * 100)) < 1e-8
    && ['weekly', 'fortnightly', 'monthly'].includes(settings.frequency)
    && (!settings.nextIncomeDate || validDate(settings.nextIncomeDate));
}
export function createInitialState(input: InitialSetup, today = localDate()): FinanceState {
  if (!validDate(input.date) || input.date > today) throw new Error('La fecha inicial debe ser válida y no estar en el futuro.');
  if (![input.bankCents, input.cashCents].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 99999999999)) throw new Error('Revisa los saldos iniciales.');
  if (input.settings.nextIncomeDate && input.settings.nextIncomeDate < input.date) throw new Error('La próxima fecha de ingreso no puede ser anterior a los saldos iniciales.');
  if (!validSettings(input.settings)) throw new Error('Revisa el ingreso habitual y el porcentaje de ofrenda.');
  return {
    opening: { date: input.date, bankCents: input.bankCents, cashCents: input.cashCents },
    balances: { bank: input.bankCents, cash: input.cashCents },
    settings: { ...input.settings }, entries: [], reserves: [], payments: [], debts: [], templates: [], debtEvents: [], edits: [],
  };
}
