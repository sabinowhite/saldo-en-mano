export type Account = 'bank' | 'cash';
export type Frequency = 'weekly' | 'fortnightly' | 'monthly';
export type Entry = { id: string; kind: 'income' | 'expense' | 'transfer'; concept: string; cents: number; date: string; account: Account };
export type Reserve = { id: string; concept: string; cents: number; account: Account; delivered: boolean };
export type Payment = { id: string; concept: string; cents: number; account: Account; date: string; reserved: boolean; paid: boolean };
export type Debt = { id: string; creditor: string; concept: string; cents: number; monthlyCents: number };
export type Settings = { salaryCents: number; frequency: Frequency; offeringPercent: number };
export type FinanceState = {
  opening: { date: string; bankCents: number; cashCents: number };
  balances: Record<Account, number>; entries: Entry[]; reserves: Reserve[];
  payments: Payment[]; debts: Debt[]; settings: Settings;
};
export type Action =
  | { type: 'entry'; entry: Entry }
  | { type: 'payment'; id: string; entryId: string; date: string }
  | { type: 'deliver'; id: string; entryId: string; date: string }
  | { type: 'debt'; id: string; entryId: string; cents: number; account: Account; date: string }
  | { type: 'settings'; settings: Settings };

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
  return state.reserves.filter(r => !r.delivered && (!account || r.account === account)).reduce((s, r) => s + r.cents, 0)
    + state.payments.filter(p => !p.paid && p.reserved && (!account || p.account === account)).reduce((s, p) => s + p.cents, 0);
}
export function available(state: FinanceState, account?: Account): number {
  return (account ? state.balances[account] : state.balances.bank + state.balances.cash) - reserved(state, account);
}
export function spendWarning(state: FinanceState, account: Account, cents: number, released = 0): string | null {
  const remaining = available(state, account) + released - cents;
  if (remaining >= 0) return null;
  return `Este movimiento deja ${money(-remaining)} sin cubrir de tus compromisos o supera tu saldo. Puedes continuar, pero deberás reponer ese dinero.`;
}
export function financeReducer(state: FinanceState, action: Action): FinanceState {
  if (action.type === 'settings') {
    const { salaryCents, offeringPercent, frequency } = action.settings;
    if (!Number.isSafeInteger(salaryCents) || salaryCents <= 0 || !Number.isFinite(offeringPercent) || offeringPercent < 0 || offeringPercent > 100 || !['weekly', 'fortnightly', 'monthly'].includes(frequency)) throw new Error('Configuración inválida.');
    return { ...state, settings: action.settings };
  }
  const actionDate = action.type === 'entry' ? action.entry.date : action.date;
  if (actionDate < state.opening.date) throw new Error('La fecha no puede ser anterior a los saldos iniciales.');
  const entryId = action.type === 'entry' ? action.entry.id : action.entryId;
  if (!entryId.trim()) throw new Error('El movimiento requiere identificador.');
  if (state.entries.some(e => e.id === entryId)) return state;
  if (action.type !== 'entry') {
    if (!validDate(action.date)) throw new Error('Fecha inválida.');
    if (action.type === 'payment') {
      const p = state.payments.find(p => p.id === action.id);
      if (!p || p.paid) return state;
      const next = financeReducer(state, { type: 'entry', entry: { id: entryId, kind: 'expense', concept: p.concept, cents: p.cents, account: p.account, date: action.date } });
      return { ...next, payments: next.payments.map(item => item.id === p.id ? { ...item, paid: true } : item) };
    }
    if (action.type === 'deliver') {
      const r = state.reserves.find(r => r.id === action.id);
      if (!r || r.delivered) return state;
      const next = financeReducer(state, { type: 'entry', entry: { id: entryId, kind: 'expense', concept: `Entrega · ${r.concept}`, cents: r.cents, account: r.account, date: action.date } });
      return { ...next, reserves: next.reserves.map(item => item.id === r.id ? { ...item, delivered: true } : item) };
    }
    const d = state.debts.find(d => d.id === action.id);
    if (!d || d.cents === 0) return state;
    if (action.cents > d.cents) throw new Error('El abono supera la deuda pendiente.');
    const next = financeReducer(state, { type: 'entry', entry: { id: entryId, kind: 'expense', concept: `Abono · ${d.concept}`, cents: action.cents, account: action.account, date: action.date } });
    return { ...next, debts: next.debts.map(item => item.id === d.id ? { ...item, cents: item.cents - action.cents } : item) };
  }
  const e = action.entry;
  if (!Number.isSafeInteger(e.cents) || e.cents <= 0 || !e.concept.trim() || !validDate(e.date) || !['bank', 'cash'].includes(e.account)) throw new Error('Movimiento inválido.');
  const balances = { ...state.balances };
  if (e.kind === 'transfer') {
    const to = e.account === 'bank' ? 'cash' : 'bank';
    balances[e.account] -= e.cents;
    balances[to] += e.cents;
  } else if (e.kind === 'income') balances[e.account] += e.cents;
  else if (e.kind === 'expense') balances[e.account] -= e.cents;
  else throw new Error('Tipo de movimiento inválido.');
  if (!Number.isSafeInteger(balances.bank) || !Number.isSafeInteger(balances.cash)) throw new Error('El saldo excede el límite permitido.');
  return { ...state, balances, entries: [e, ...state.entries] };
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
    settings: { salaryCents: 1400000, frequency: 'fortnightly', offeringPercent: 5 },
  };
}
