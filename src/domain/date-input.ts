import { localDate, validDate } from './finance.ts';
// Use local noon rather than parsing ISO as UTC, which changes the day in Mexico.
export function pickerDate(value: string): Date {
  const [year, month, day] = (validDate(value) ? value : localDate()).split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function dateLabel(value: string): string {
  return validDate(value) ? pickerDate(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Elegir fecha';
}
