import { nextScheduled } from './schedule.ts';
import type { Repeat } from './schedule.ts';
export type Account = 'bank' | 'cash';
export type Frequency = 'weekly' | 'fortnightly' | 'monthly';
export type Link = { kind: 'payment' | 'reserve' | 'debt' | 'income'; id: string };
export type Entry = { id: string; kind: 'income' | 'expense' | 'transfer'; concept: string; cents: number; date: string; account: Account; link?: Link };
export type Reserve = { id: string; concept: string; cents: number; account: Account; delivered: boolean; deliveredCents?: number; cancelled?: boolean; date?: string };
export type Payment = { id: string; concept: string; cents: number; account: Account; date: string; reserved: boolean; paid: boolean; templateId?: string; cancelled?: boolean };
export type PaymentTemplate = { id: string; concept: string; cents: number; account: Account; reserved: boolean; variable: boolean; frequency: Repeat; nextDate: string; anchorDay: number; enabled: boolean; reminder: boolean };
export type Debt = { id: string; creditor: string; concept: string; cents: number; monthlyCents: number; nextChargeDate?: string; anchorDay?: number };
export type DebtEvent = { id: string; debtId: string; date: string; kind: 'opening' | 'charge' | 'adjustment'; cents: number };
export type EntryEdit = { id: string; date: string; entryId: string; before: Entry; after: Entry | null };
export type Settings = { salaryCents: number; frequency: Frequency; offeringPercent: number; nextIncomeDate?: string; incomeAnchorDay?: number };
export type ExpectedIncome = { id: string; date: string; cents: number; receivedCents: number };
export type FinanceState = {
  opening: { date: string; bankCents: number; cashCents: number };
  balances: Record<Account, number>; entries: Entry[]; reserves: Reserve[];
  payments: Payment[]; debts: Debt[]; settings: Settings;
  templates?: PaymentTemplate[]; debtEvents?: DebtEvent[]; edits?: EntryEdit[]; expectedIncomes?: ExpectedIncome[]; incomeCursor?: string;
};
export type Action =
  | { type: 'entry'; entry: Entry }
  | { type: 'edit-entry'; entry: Entry; operationId: string; today: string }
  | { type: 'delete-entry'; id: string; operationId: string; today: string }
  | { type: 'payment'; id: string; entryId: string; date: string; cents?: number; account?: Account }
  | { type: 'deliver'; id: string; entryId: string; date: string; cents?: number; account?: Account }
  | { type: 'debt'; id: string; entryId: string; cents: number; account: Account; date: string }
  | { type: 'settings'; settings: Settings }
  | { type: 'receive-expected'; id: string; entryId: string; cents: number; account: Account; date: string }
  | { type: 'save-reserves'; reserves: Reserve[] }
  | { type: 'cancel-reserve'; id: string }
  | { type: 'save-payment'; payment: Payment }
  | { type: 'cancel-payment'; id: string }
  | { type: 'save-template'; template: PaymentTemplate; today: string }
  | { type: 'save-debt'; debt: Debt; operationId: string; date: string; today?: string }
  | { type: 'tick'; today: string };
export class FinanceError extends Error { constructor(message: string) { super(message); this.name = 'FinanceError'; } }

export const money = (cents: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(cents / 100);
export function parseMoney(value: string): number | null {
  const text = value.trim();
  if (!/^\d{1,9}(?:[.,]\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 2000 || year > 2100) return false;
  return localDate(new Date(year, month - 1, day, 12)) === value;
}
export function period(date: string) {
  return `${date.slice(0, 7)}-${Number(date.slice(8)) <= 15 ? '1' : '2'}`;
}
export function periodLabel(date = localDate()): string {
  const [y, m, d] = date.split('-').map(Number);
  const month = new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return `${d <= 15 ? '1–15' : `16–${new Date(y, m, 0).getDate()}`} de ${month}`;
}
export function contributions(incomeCents: number, offeringPercent: number) {
  if (!Number.isSafeInteger(incomeCents) || incomeCents < 0 || !Number.isFinite(offeringPercent) || offeringPercent < 0 || offeringPercent > 100) throw new Error('Configuración de aportaciones inválida.');
  return { tithe: Math.round(incomeCents / 10), offering: Math.round(incomeCents * offeringPercent / 100) };
}
export function reserved(state: FinanceState, account?: Account): number {
  return state.reserves.filter(r => !r.cancelled && !r.delivered && (!account || r.account === account)).reduce((s, r) => s + remainingReserve(r), 0)
    + state.payments.filter(p => !p.paid && !p.cancelled && p.reserved && (!account || p.account === account)).reduce((s, p) => s + p.cents, 0);
}
export function available(state: FinanceState, account?: Account): number {
  return (account ? state.balances[account] : state.balances.bank + state.balances.cash) - reserved(state, account);
}
export function spendWarning(state: FinanceState, account: Account, cents: number, released = 0): string | null {
  const remaining = available(state, account) + released - cents;
  if (remaining >= 0) return null;
  return `Este movimiento deja ${money(-remaining)} sin cubrir de tus compromisos o supera tu saldo. Puedes continuar, pero deberás reponer ese dinero.`;
}

export function demoState(today = localDate()): FinanceState {
  return {
    opening: { date: today, bankCents: 0, cashCents: 0 },
    balances: { bank: 1100000, cash: 252000 },
    entries: [
      { id: 'demo-gas', kind: 'expense', concept: 'Gasolina', cents: 48000, date: today, account: 'cash' },
      { id: 'demo-withdraw', kind: 'transfer', concept: 'Retiro a cartera', cents: 300000, date: today, account: 'bank' },
      { id: 'demo-income', kind: 'income', concept: 'Ingreso recibido', cents: 1400000, date: today, account: 'bank' },
    ],
    reserves: [
      { id: 'tithe', concept: 'Diezmo', cents: 140000, account: 'bank', delivered: false },
      { id: 'offering', concept: 'Ofrenda', cents: 70000, account: 'bank', delivered: false },
      { id: 'investment', concept: 'Fondo de inversión', cents: 10000, account: 'bank', delivered: false },
    ],
    payments: [
      { id: 'card', concept: 'Pago de tarjeta', cents: 200000, account: 'bank', date: today, reserved: true, paid: false },
      { id: 'internet', concept: 'Internet', cents: 35000, account: 'bank', date: today, reserved: false, paid: false },
    ],
    debts: [
      { id: 'music', creditor: 'Familiar de ejemplo', concept: 'Suscripción de música', cents: 50000, monthlyCents: 10000 },
      { id: 'video', creditor: 'Amigo de ejemplo', concept: 'Suscripción de video', cents: 150000, monthlyCents: 15000 },
    ],
    templates: [], debtEvents: [
      { id: 'music-opening', debtId: 'music', date: today, kind: 'opening', cents: 50000 },
      { id: 'video-opening', debtId: 'video', date: today, kind: 'opening', cents: 150000 },
    ], edits: [],
    settings: { salaryCents: 1400000, frequency: 'fortnightly', offeringPercent: 5 },
  };
}

function requireTrue(value: unknown, message: string): asserts value { if (!value) throw new FinanceError(message); }
const validAmount = (n: number, zero = false) => Number.isSafeInteger(n) && (zero ? n >= 0 : n > 0) && n <= 99999999999;
const validAccount = (a: Account) => a === 'bank' || a === 'cash';
const validText = (s: string) => typeof s === 'string' && s.trim().length > 0 && s.length <= 200;
export function deliveredReserve(r: Reserve): number { return r.deliveredCents ?? (r.delivered ? r.cents : 0); }
export function remainingReserve(r: Reserve): number { return r.cancelled ? 0 : r.cents - deliveredReserve(r); }
export function recomputeBalances(state: FinanceState, entries = state.entries) {
  const balances = { bank: state.opening.bankCents, cash: state.opening.cashCents };
  for (const e of entries) {
    balances[e.account] += e.kind === 'income' ? e.cents : -e.cents;
    if (e.kind === 'transfer') balances[e.account === 'bank' ? 'cash' : 'bank'] += e.cents;
  }
  requireTrue(Number.isSafeInteger(balances.bank) && Number.isSafeInteger(balances.cash), 'El saldo excede el límite permitido.');
  return balances;
}
function checkEntry(state: FinanceState, e: Entry) {
  requireTrue(validText(e.id) && validText(e.concept) && validAmount(e.cents) && validAccount(e.account) && validDate(e.date) && e.date >= state.opening.date && ['income', 'expense', 'transfer'].includes(e.kind), 'Revisa el concepto, monto, origen y fecha del movimiento.');
}
function addEntry(state: FinanceState, entry: Entry): FinanceState {
  checkEntry(state, entry);
  const entries = [entry, ...state.entries];
  return { ...state, entries, balances: recomputeBalances(state, entries) };
}
function patchLinked(state: FinanceState, old: Entry, replacement: Entry | null): FinanceState {
  const link = old.link;
  if (!link) return state;
  if (link.kind === 'income') {
    requireTrue(!replacement || replacement.kind === 'income', 'Este registro debe continuar como ingreso.');
    return { ...state, expectedIncomes: (state.expectedIncomes ?? []).map(e => e.id === link.id ? { ...e, receivedCents: e.receivedCents + (replacement?.cents ?? 0) - old.cents } : e) };
  }
  requireTrue(!replacement || replacement.kind === 'expense', 'Este registro debe continuar como gasto.');
  const delta = (replacement?.cents ?? 0) - old.cents;
  if (link.kind === 'debt') {
    const d = state.debts.find(d => d.id === link.id);
    requireTrue(d && d.cents - delta >= 0, 'El abono corregido supera el saldo de la deuda.');
    return { ...state, debts: state.debts.map(item => item.id === d.id ? { ...item, cents: item.cents - delta } : item) };
  }
  if (link.kind === 'reserve') {
    const r = state.reserves.find(r => r.id === link.id);
    requireTrue(r, 'No se encontró el apartado.');
    const deliveredCents = deliveredReserve(r) + delta;
    requireTrue(deliveredCents >= 0 && deliveredCents <= r.cents, 'La entrega corregida supera el apartado.');
    return { ...state, reserves: state.reserves.map(item => item.id === r.id ? { ...item, deliveredCents, delivered: deliveredCents === item.cents } : item) };
  }
  return { ...state, payments: state.payments.map(p => p.id === link.id ? { ...p, paid: !!replacement, cents: replacement?.cents ?? p.cents, account: replacement?.account ?? p.account } : p) };
}
export function financeReducer(state: FinanceState, action: Action): FinanceState {
  if (action.type === 'tick') return reconcileSchedules(state, action.today);
  if (action.type === 'settings') {
    const s = action.settings;
    requireTrue(validAmount(s.salaryCents) && Number.isFinite(s.offeringPercent) && s.offeringPercent >= 0 && s.offeringPercent <= 100 && Math.abs(s.offeringPercent * 100 - Math.round(s.offeringPercent * 100)) < 1e-8 && ['weekly', 'fortnightly', 'monthly'].includes(s.frequency), 'Configuración inválida.');
    requireTrue(!s.nextIncomeDate || (validDate(s.nextIncomeDate) && s.nextIncomeDate >= state.opening.date), 'Indica una fecha válida para el próximo ingreso.');
    const changed = s.nextIncomeDate !== state.settings.nextIncomeDate || s.frequency !== state.settings.frequency;
    const next = { ...state, settings: { ...s }, incomeCursor: changed ? s.nextIncomeDate : state.incomeCursor, expectedIncomes: changed ? (state.expectedIncomes ?? []).filter(e => e.date <= localDate() || e.receivedCents > 0) : state.expectedIncomes };
    return s.nextIncomeDate ? reconcileSchedules(next, localDate()) : next;
  }
  if (action.type === 'save-reserves') {
    let reserves = [...state.reserves];
    for (const value of action.reserves) {
      const old = reserves.find(r => r.id === value.id);
      const spent = old ? deliveredReserve(old) : 0;
      requireTrue(validText(value.id) && validText(value.concept) && validAmount(value.cents) && validAccount(value.account) && value.cents >= spent && (!value.date || (validDate(value.date) && value.date >= state.opening.date)), 'El apartado debe tener un monto válido y no ser menor que lo ya entregado.');
      const next = { ...value, deliveredCents: spent, delivered: spent === value.cents, cancelled: old?.cancelled ?? false };
      reserves = [next, ...reserves.filter(r => r.id !== value.id)];
    }
    return { ...state, reserves };
  }
  if (action.type === 'cancel-reserve') return { ...state, reserves: state.reserves.map(r => r.id === action.id ? { ...r, cancelled: true } : r) };
  if (action.type === 'save-payment') {
    const p = action.payment; const old = state.payments.find(p => p.id === action.payment.id);
    requireTrue(!old?.paid, 'Corrige un pago realizado desde sus movimientos.');
    requireTrue(validText(p.id) && validText(p.concept) && validAmount(p.cents, true) && validAccount(p.account) && validDate(p.date) && p.date >= state.opening.date, 'Revisa los datos del pago.');
    return { ...state, payments: [{ ...p, paid: false }, ...state.payments.filter(item => item.id !== p.id)] };
  }
  if (action.type === 'cancel-payment') return { ...state, payments: state.payments.map(p => p.id === action.id && !p.paid ? { ...p, cancelled: true } : p) };
  if (action.type === 'save-template') {
    const t = action.template;
    requireTrue(validText(t.id) && validText(t.concept) && validAmount(t.cents, t.variable) && validAccount(t.account) && validDate(t.nextDate) && t.nextDate >= state.opening.date && ['once', 'weekly', 'fortnightly', 'monthly', 'bimonthly'].includes(t.frequency) && Number.isInteger(t.anchorDay) && t.anchorDay >= 1 && t.anchorDay <= 31, 'Revisa la plantilla y su próxima fecha.');
    const templates = [{ ...t }, ...(state.templates ?? []).filter(item => item.id !== t.id)];
    // The first scheduled occurrence is visible immediately, even if it is future.
    return reconcileSchedules({ ...state, templates }, action.today, (state.templates ?? []).some(item => item.id === t.id) ? undefined : t.id);
  }
  if (action.type === 'save-debt') {
    if ((state.debtEvents ?? []).some(e => e.id === action.operationId)) return state;
    const d = action.debt; const old = state.debts.find(d => d.id === action.debt.id);
    requireTrue(validText(d.id) && validText(d.creditor) && validText(d.concept) && validAmount(d.cents, true) && validAmount(d.monthlyCents, true) && validDate(action.date) && action.date >= state.opening.date, 'Revisa los datos de la deuda.');
    requireTrue(!d.monthlyCents || (d.nextChargeDate && validDate(d.nextChargeDate) && d.nextChargeDate >= state.opening.date && Number.isInteger(d.anchorDay) && d.anchorDay! >= 1 && d.anchorDay! <= 31), 'Indica la próxima fecha del cargo mensual.');
    const event: DebtEvent = { id: action.operationId, debtId: d.id, date: action.date, kind: old ? 'adjustment' : 'opening', cents: d.cents - (old?.cents ?? 0) };
    const next = { ...state, debts: [{ ...d }, ...state.debts.filter(item => item.id !== d.id)], debtEvents: [...(state.debtEvents ?? []), event] };
    return action.today ? reconcileSchedules(next, action.today) : next;
  }
  if (action.type === 'edit-entry' || action.type === 'delete-entry') {
    if ((state.edits ?? []).some(e => e.id === action.operationId)) return state;
    const id = action.type === 'edit-entry' ? action.entry.id : action.id;
    const old = state.entries.find(e => e.id === id);
    requireTrue(old, 'No se encontró el movimiento.');
    const nextEntry = action.type === 'edit-entry' ? { ...action.entry, link: old.link } : null;
    if (nextEntry) checkEntry(state, nextEntry);
    const updated = patchLinked(state, old, nextEntry);
    const entries = nextEntry ? updated.entries.map(e => e.id === id ? nextEntry : e) : updated.entries.filter(e => e.id !== id);
    return { ...updated, entries, balances: recomputeBalances(updated, entries), edits: [...(state.edits ?? []), { id: action.operationId, date: action.today, entryId: id, before: old, after: nextEntry }] };
  }
  const id = action.type === 'entry' ? action.entry.id : action.entryId;
  if (state.entries.some(e => e.id === id) || (state.edits ?? []).some(e => e.entryId === id && e.after === null)) return state;
  if (action.type === 'entry') return addEntry(state, { ...action.entry, link: undefined });
  requireTrue(validDate(action.date) && action.date >= state.opening.date, 'La fecha debe ser válida y posterior a los saldos iniciales.');
  if (action.type === 'receive-expected') {
    const expected = (state.expectedIncomes ?? []).find(e => e.id === action.id);
    requireTrue(expected, 'No se encontró el ingreso esperado.');
    const next = addEntry(state, { id, kind: 'income', concept: 'Ingreso habitual recibido', cents: action.cents, account: action.account, date: action.date, link: { kind: 'income', id: action.id } });
    return { ...next, expectedIncomes: (next.expectedIncomes ?? []).map(e => e.id === action.id ? { ...e, receivedCents: e.receivedCents + action.cents } : e) };
  }
  if (action.type === 'payment') {
    const p = state.payments.find(p => p.id === action.id);
    if (!p || p.paid || p.cancelled) return state;
    const cents = action.cents ?? p.cents; const account = action.account ?? p.account;
    const next = addEntry(state, { id, kind: 'expense', concept: p.concept, cents, account, date: action.date, link: { kind: 'payment', id: p.id } });
    return { ...next, payments: next.payments.map(item => item.id === p.id ? { ...item, paid: true, cents, account } : item) };
  }
  if (action.type === 'deliver') {
    const r = state.reserves.find(r => r.id === action.id);
    if (!r || r.delivered || r.cancelled) return state;
    const cents = action.cents ?? remainingReserve(r); const account = action.account ?? r.account;
    requireTrue(cents <= remainingReserve(r), 'La entrega supera lo pendiente del apartado.');
    const next = addEntry(state, { id, kind: 'expense', concept: `Entrega · ${r.concept}`, cents, account, date: action.date, link: { kind: 'reserve', id: r.id } });
    const deliveredCents = deliveredReserve(r) + cents;
    return { ...next, reserves: next.reserves.map(item => item.id === r.id ? { ...item, deliveredCents, delivered: deliveredCents === item.cents } : item) };
  }
  const d = state.debts.find(d => d.id === action.id);
  if (!d || d.cents === 0) return state;
  requireTrue(action.cents <= d.cents, 'El abono supera la deuda pendiente.');
  const next = addEntry(state, { id, kind: 'expense', concept: `Abono · ${d.concept}`, cents: action.cents, account: action.account, date: action.date, link: { kind: 'debt', id: d.id } });
  return { ...next, debts: next.debts.map(item => item.id === d.id ? { ...item, cents: item.cents - action.cents } : item) };
}
export function reconcileSchedules(state: FinanceState, today: string, forceTemplate?: string): FinanceState {
  requireTrue(validDate(today), 'Fecha de actualización inválida.');
  let payments = [...state.payments]; const events = [...(state.debtEvents ?? [])];
  const templates = (state.templates ?? []).map(original => {
    let t = { ...original }; let count = 0; let force = t.id === forceTemplate;
    while (t.enabled && (t.nextDate <= today || force)) {
      requireTrue(++count <= 5500, 'La programación requiere demasiados periodos.');
      const id = `scheduled:${t.id}:${t.nextDate}`;
      if (!payments.some(p => p.id === id)) payments.push({ id, templateId: t.id, concept: t.concept, cents: t.cents, account: t.account, reserved: t.reserved, date: t.nextDate, paid: false });
      const next = nextScheduled(t.nextDate, t.frequency, t.anchorDay);
      if (!next) t.enabled = false; else t.nextDate = next;
      force = false;
    }
    return t;
  });
  const debts = state.debts.map(original => {
    const d = { ...original }; let count = 0;
    while (d.monthlyCents > 0 && d.nextChargeDate && d.nextChargeDate <= today) {
      requireTrue(++count <= 1300, 'La deuda requiere demasiados periodos.');
      const id = `charge:${d.id}:${d.nextChargeDate}`;
      if (!events.some(e => e.id === id)) { events.push({ id, debtId: d.id, date: d.nextChargeDate, kind: 'charge', cents: d.monthlyCents }); d.cents += d.monthlyCents; }
      requireTrue(validAmount(d.cents, true), 'La deuda excede el límite permitido.');
      d.nextChargeDate = nextScheduled(d.nextChargeDate, 'monthly', d.anchorDay) ?? undefined;
    }
    return d;
  });
  const settings = { ...state.settings }; const expectedIncomes = [...(state.expectedIncomes ?? [])];
  let incomeCursor = state.incomeCursor ?? settings.nextIncomeDate; let count = 0;
  while (incomeCursor && (incomeCursor <= today || !expectedIncomes.some(e => e.date > today && e.receivedCents < e.cents))) {
    requireTrue(++count <= 5500, 'Hay demasiados periodos de ingreso pendientes.');
    const id = `income:${incomeCursor}`;
    if (!expectedIncomes.some(e => e.id === id)) expectedIncomes.push({ id, date: incomeCursor, cents: settings.salaryCents, receivedCents: 0 });
    incomeCursor = nextScheduled(incomeCursor, settings.frequency, settings.incomeAnchorDay ?? Number(incomeCursor.slice(8))) ?? undefined;
  }
  return { ...state, templates, payments, debts, debtEvents: events, settings, expectedIncomes, incomeCursor };
}

export function actionWarning(state: FinanceState, action: Action): string | null {
  const next = financeReducer(state, action);
  const impacted = (['bank', 'cash'] as const).filter(a => available(next, a) < 0 && available(next, a) < available(state, a));
  return impacted.length ? 'Este cambio deja dinero sin cubrir en ' + impacted.map(a => (a === 'bank' ? 'banco' : 'efectivo') + ' (' + money(-available(next, a)) + ')').join(' y ') + '. Puedes continuar, pero afectará tus compromisos o superará tu saldo.' : null;
}
