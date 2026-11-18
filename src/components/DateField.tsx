import { useState } from 'react';
import { Keyboard, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { localDate } from '../domain/finance';
import { dateLabel, pickerDate } from '../domain/date-input';
import { Button, Icon, colors, ui } from './ui';
export type DateFieldProps = { label: string; value: string; onChange: (value: string) => void; maximumDate?: string };
export function DateField({ label, value, onChange, maximumDate }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(pickerDate(value));
  const min = pickerDate('2000-01-01');
  const max = pickerDate(maximumDate ?? '2100-12-31');
  function show() {
    Keyboard.dismiss();
    const selected = pickerDate(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: selected, mode: 'date', display: 'calendar', minimumDate: min, maximumDate: max, positiveButton: { label: 'Elegir', textColor: colors.primary }, negativeButton: { label: 'Cancelar', textColor: colors.muted }, onChange: (event, date) => { if (event.type === 'set' && date) onChange(localDate(date)); } });
    } else { setDraft(selected); setOpen(true); }
  }
  return <View style={{ gap: 10 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${dateLabel(value)}`} accessibilityHint="Abre el calendario para elegir una fecha" onPress={show} style={[ui.input, ui.spread]}>
      <Text style={[ui.body, { flex: 1 }]}>{dateLabel(value)}</Text><Icon name="calendar-outline" />
    </Pressable>
    {open && Platform.OS === 'ios' && <View style={{ gap: 10 }}>
      <DateTimePicker value={draft} mode="date" display="inline" minimumDate={min} maximumDate={max} themeVariant="light" accentColor={colors.primary} onChange={(_, date) => { if (date) setDraft(date); }} />
      <Button label="Elegir fecha" onPress={() => { onChange(localDate(draft)); setOpen(false); }} />
      <Button label="Cancelar" secondary onPress={() => setOpen(false)} />
    </View>}
  </View>;
}
