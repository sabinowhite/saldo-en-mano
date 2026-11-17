import type { FinanceState } from '../domain/finance.ts';
import { validDate } from '../domain/finance.ts';
import { validSettings } from '../domain/setup.ts';
import { StorageError } from './errors.ts';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const nonnegative = (v: unknown): v is number => integer(v) && v >= 0;
const positive = (v: unknown): v is number => integer(v) && v > 0;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
const account = (v: unknown) => v === 'bank' || v === 'cash';
const date = (v: unknown): v is string => typeof v === 'string' && validDate(v);
function fail(): never { throw new StorageError('corrupt-data'); }
export function assertFinanceState(input: unknown): asserts input is FinanceState {
  if (!object(input) || !object(input.opening) || !object(input.balances) || !object(input.settings)) fail();
  const { opening, balances, settings } = input;
  if (!date(opening.date) || !nonnegative(opening.bankCents) || !nonnegative(opening.cashCents) || !integer(balances.bank) || !integer(balances.cash)) fail();
  if (!positive(settings.salaryCents) || typeof settings.offeringPercent !== 'number' || typeof settings.frequency !== 'string') fail();
  if (!validSettings(settings as FinanceState['settings'])) fail();
  const names = ['entries', 'reserves', 'payments', 'debts'] as const;
  for (const name of names) {
    const items = input[name];
    if (!Array.isArray(items)) fail();
    const ids = new Set<string>();
    for (const item of items) {
      if (!object(item) || !text(item.id) || ids.has(item.id) || !text(item.concept)) fail();
      ids.add(item.id);
      if (name === 'entries') {
        if (!['income', 'expense', 'transfer'].includes(String(item.kind)) || !positive(item.cents) || !account(item.account) || !date(item.date) || item.date < opening.date) fail();
      } else if (name === 'reserves') {
        if (!positive(item.cents) || !account(item.account) || typeof item.delivered !== 'boolean') fail();
        if (item.deliveredCents !== undefined && (!nonnegative(item.deliveredCents) || item.deliveredCents > item.cents || item.delivered !== (item.deliveredCents === item.cents))) fail();
        if (item.cancelled !== undefined && typeof item.cancelled !== 'boolean') fail();
      } else if (name === 'payments') {
        if (!nonnegative(item.cents) || !account(item.account) || !date(item.date) || typeof item.reserved !== 'boolean' || typeof item.paid !== 'boolean' || (item.paid && item.cents === 0)) fail();
        if (item.cancelled !== undefined && typeof item.cancelled !== 'boolean') fail();
      } else {
        if (!nonnegative(item.cents) || !nonnegative(item.monthlyCents) || !text(item.creditor)) fail();
        if (item.nextChargeDate !== undefined && (!date(item.nextChargeDate) || !integer(item.anchorDay) || item.anchorDay < 1 || item.anchorDay > 31)) fail();
      }
    }
  }
  const templates = input.templates ?? [];
  const events = input.debtEvents ?? [];
  const edits = input.edits ?? [];
  const expected = input.expectedIncomes ?? [];
  for (const list of [templates, events, edits, expected]) {
    if (!Array.isArray(list)) fail();
    const ids = new Set<string>();
    for (const item of list) { if (!object(item) || !text(item.id) || ids.has(item.id)) fail(); ids.add(item.id); }
  }
  for (const t of templates as Record<string, unknown>[]) {
    if (!text(t.concept) || !nonnegative(t.cents) || (!t.variable && t.cents === 0) || !account(t.account) || !date(t.nextDate) || !integer(t.anchorDay) || t.anchorDay < 1 || t.anchorDay > 31 || !['once', 'weekly', 'fortnightly', 'monthly', 'bimonthly'].includes(String(t.frequency)) || typeof t.enabled !== 'boolean' || typeof t.reserved !== 'boolean' || typeof t.variable !== 'boolean' || typeof t.reminder !== 'boolean') fail();
  }
  for (const e of events as Record<string, unknown>[]) {
    if (!text(e.debtId) || !date(e.date) || !integer(e.cents) || !['opening', 'charge', 'adjustment'].includes(String(e.kind))) fail();
  }
  for (const e of expected as Record<string, unknown>[]) { if (!date(e.date) || !positive(e.cents) || !nonnegative(e.receivedCents)) fail(); }
  if (settings.nextIncomeDate !== undefined && !date(settings.nextIncomeDate)) fail();
  if (input.incomeCursor !== undefined && !date(input.incomeCursor)) fail();
  for (const e of edits as Record<string, unknown>[]) {
    if (!text(e.entryId) || !date(e.date) || !object(e.before) || (e.after !== null && !object(e.after))) fail();
  }
  // Validate the accounting identity, not just JSON field types.
  const state = input as unknown as FinanceState;
  const computed = { bank: opening.bankCents, cash: opening.cashCents };
  for (const e of state.entries) {
    computed[e.account] += e.kind === 'income' ? e.cents : -e.cents;
    if (e.kind === 'transfer') computed[e.account === 'bank' ? 'cash' : 'bank'] += e.cents;
    if (!Number.isSafeInteger(computed.bank) || !Number.isSafeInteger(computed.cash)) fail();
  }
  if (computed.bank !== balances.bank || computed.cash !== balances.cash) fail();
}
export function encodeState(state: FinanceState): string {
  assertFinanceState(state);
  return JSON.stringify(state);
}
export function decodeState(payload: string): FinanceState {
  let state: unknown;
  try { state = JSON.parse(payload); } catch { fail(); }
  assertFinanceState(state);
  return state;
}
