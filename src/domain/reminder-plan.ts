import type { FinanceState } from './finance.ts';
import { localDate } from './finance.ts';
import { nextScheduled } from './schedule.ts';
export function reminderPlan(state: FinanceState, now = new Date()): { id: string; at: Date; body: string }[] {
  const today = localDate(now); const dates = new Set<string>();
  const horizon = localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90, 12));
  for (const p of state.payments) if (!p.paid && !p.cancelled && (!p.templateId || (state.templates ?? []).some(t => t.id === p.templateId && t.reminder))) dates.add(p.date);
  for (const t of state.templates ?? []) {
    if (!t.enabled || !t.reminder) continue;
    let date: string | null = t.nextDate; let count = 0;
    while (date && date <= horizon && ++count < 100) { dates.add(date); date = nextScheduled(date, t.frequency, t.anchorDay); }
  }
  for (const e of state.expectedIncomes ?? []) if (e.receivedCents < e.cents) dates.add(e.date);
  let nextIncome = state.incomeCursor ?? state.settings.nextIncomeDate; let count = 0;
  while (nextIncome && nextIncome <= horizon && ++count < 100) { dates.add(nextIncome); nextIncome = nextScheduled(nextIncome, state.settings.frequency, state.settings.incomeAnchorDay) ?? undefined; }
  const planned = new Map<string, { id: string; at: Date; body: string }>();
  for (const date of dates) {
    const [y, m, d] = date.split('-').map(Number); let at = new Date(y, m - 1, d, 9);
    if (date <= today && at <= now) at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9);
    if (at <= now || localDate(at) > horizon) continue;
    const id = 'saldo:review:' + localDate(at);
    planned.set(id, { id, at, body: 'Revisa tus pagos e ingresos pendientes en Saldo en Mano.' });
  }
  for (let offset = 0; offset < 3; offset++) for (const day of [15, new Date(now.getFullYear(), now.getMonth() + offset + 1, 0).getDate()]) {
    const at = new Date(now.getFullYear(), now.getMonth() + offset, day, 19);
    if (at > now) { const id = 'saldo:close:' + localDate(at); planned.set(id, { id, at, body: 'Es momento de revisar el resumen de tu quincena.' }); }
  }
  return [...planned.values()].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 50);
}
