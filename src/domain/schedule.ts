import { localDate, validDate } from './finance.ts';
export type Repeat = 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'bimonthly';
export const repeatLabels: Record<Repeat, string> = { once: 'Una vez', weekly: 'Semanal', fortnightly: 'Quincenal (1 y 16)', monthly: 'Mensual', bimonthly: 'Bimestral' };
export function nextScheduled(date: string, frequency: Repeat, anchorDay = Number(date.slice(8))): string | null {
  if (!validDate(date) || !Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) throw new Error('Fecha de programación inválida.');
  if (frequency === 'once') return null;
  const [y, m, d] = date.split('-').map(Number);
  let next: Date;
  if (frequency === 'weekly') next = new Date(y, m - 1, d + 7, 12);
  else if (frequency === 'fortnightly') next = d < 16 ? new Date(y, m - 1, 16, 12) : new Date(y, m, 1, 12);
  else {
    const target = m - 1 + (frequency === 'bimonthly' ? 2 : 1);
    const last = new Date(y, target + 1, 0).getDate();
    next = new Date(y, target, Math.min(anchorDay, last), 12);
  }
  const result = localDate(next);
  return validDate(result) ? result : null;
}
