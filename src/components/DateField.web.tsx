import { colors } from './ui';
import { validDate } from '../domain/finance';
import type { DateFieldProps } from './DateField';
export function DateField({ label, value, onChange, maximumDate }: DateFieldProps) {
  return <input type="date" aria-label={label} value={value} min="2000-01-01" max={maximumDate ?? '2100-12-31'} onChange={event => { if (validDate(event.target.value)) onChange(event.target.value); }} style={{ boxSizing: 'border-box', width: '100%', minHeight: 52, padding: 14, borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.ink, fontFamily: 'inherit', fontSize: 16, colorScheme: 'light' }} />;
}
