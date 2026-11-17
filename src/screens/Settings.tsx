import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { FinanceState, Settings as SettingsType, contributions, money, parseMoney, localDate } from '../domain/finance';
import { nextScheduled } from '../domain/schedule';
import { SecurityControls } from '../components/SecurityControls';
import { Button, Card, Chip, Heading, Icon, Notice, colors, ui } from '../components/ui';
export function Settings({ state, mode, onSave, onReset, onDemo, onLeaveDemo, onRestore }: { state: FinanceState; mode: 'demo' | 'local'; onSave: (s: SettingsType) => Promise<void>; onReset: () => void; onDemo: () => void; onLeaveDemo: () => void; onRestore: (state: FinanceState) => Promise<void> }) {
  const [salary, setSalary] = useState(String(state.settings.salaryCents / 100));
  const [offering, setOffering] = useState(String(state.settings.offeringPercent));
  const [frequency, setFrequency] = useState(state.settings.frequency);
  const [incomeDate, setIncomeDate] = useState(state.settings.nextIncomeDate ?? nextScheduled(localDate(), state.settings.frequency) ?? localDate());
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const salaryCents = parseMoney(salary);
  const percent = /^\d{1,3}(?:[.,]\d{1,2})?$/.test(offering) ? Number(offering.replace(',', '.')) : NaN;
  const valid = salaryCents !== null && Number.isFinite(percent) && percent >= 0 && percent <= 100;
  const preview = contributions(salaryCents ?? 0, valid ? percent : 0);
  async function save() {
    if (!valid || salaryCents === null || saving) return;
    setSaving(true); setSaveError(''); setFeedback('');
    try {
      await onSave({ salaryCents, frequency, offeringPercent: percent, nextIncomeDate: incomeDate, incomeAnchorDay: Number(incomeDate.slice(8)) });
      setFeedback(mode === 'demo' ? 'Configuración aplicada a la demostración.' : 'Configuración guardada. Los movimientos y apartados anteriores se mantienen.');
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'No se pudo guardar. Intenta nuevamente.'); }
    finally { setSaving(false); }
  }
  return <View style={{ gap: 20 }}><Heading title="A tu medida" subtitle="Tú decides cómo organizarte." />
    <Card><View style={ui.row}><Icon name="cash-outline" /><Text style={ui.h2}>Tu ingreso habitual</Text></View><Text style={ui.small}>Configúralo una vez. Solo el ingreso confirmado aumenta el saldo.</Text><Text style={ui.h3}>Monto en pesos</Text><TextInput accessibilityLabel="Monto del ingreso habitual" style={ui.input} keyboardType="decimal-pad" value={salary} onChangeText={setSalary} maxLength={12} /><Text style={ui.h3}>Frecuencia</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{([{ key: 'weekly', label: 'Semanal' }, { key: 'fortnightly', label: 'Quincenal' }, { key: 'monthly', label: 'Mensual' }] as const).map(f => <Chip key={f.key} label={f.label} selected={frequency === f.key} onPress={() => setFrequency(f.key)} />)}</View><Text style={ui.h3}>Fecha base de ingresos (AAAA-MM-DD)</Text><TextInput accessibilityLabel="Próxima fecha de ingreso" style={ui.input} value={incomeDate} onChangeText={setIncomeDate} maxLength={10} /></Card>
    <Card><View style={ui.row}><Icon name="heart-outline" /><Text style={ui.h2}>Tus aportaciones</Text></View><Text style={ui.small}>Diezmo: 10 % del ingreso. La ofrenda también se calcula sobre el ingreso.</Text><Text style={ui.h3}>Porcentaje de ofrenda</Text><TextInput accessibilityLabel="Porcentaje de ofrenda sobre el ingreso" style={ui.input} keyboardType="decimal-pad" value={offering} onChangeText={setOffering} maxLength={6} /><View style={ui.spread}><Text style={ui.body}>Diezmo estimado</Text><Text style={ui.h3}>{money(preview.tithe)}</Text></View><View style={ui.spread}><Text style={ui.body}>Ofrenda estimada</Text><Text style={ui.h3}>{money(preview.offering)}</Text></View><Text style={ui.small}>Esta vista previa no crea apartados ni modifica los ya confirmados.</Text></Card>
    {!valid && <Notice>Escribe un ingreso mayor que cero y una ofrenda entre 0 y 100 %, con hasta dos decimales.</Notice>}
    <Button label={saving ? 'Guardando…' : mode === 'demo' ? 'Aplicar a la demostración' : 'Guardar configuración'} onPress={save} disabled={!valid || saving} />
    {!!saveError && <Text accessibilityLiveRegion="polite" style={{ color: colors.red }}>{saveError}</Text>}
    {!!feedback && <Text accessibilityLiveRegion="polite" style={[ui.small, { color: colors.primary }]}>{feedback}</Text>}
    {mode === 'local' && <SecurityControls state={state} onRestore={onRestore} />}
    <Card><Heading title="Saldos de apertura" subtitle={state.opening.date.split('-').reverse().join('/')} /><Text style={ui.small}>Banco: {money(state.opening.bankCents)} · Efectivo: {money(state.opening.cashCents)}. Los movimientos se registran a partir de esa fecha.</Text></Card>
    <Notice>Versión de prueba: utiliza datos ficticios hasta completar las pruebas en dispositivos y la recuperación de respaldos.</Notice>
    {mode === 'demo' ? <><Button label="Reiniciar datos de ejemplo" onPress={onReset} secondary icon="refresh-outline" /><Button label="Salir de la demostración" onPress={onLeaveDemo} secondary /></> : <Button label="Explorar demostración sin modificar mis datos" onPress={onDemo} secondary />}
    <Text style={[ui.small, { textAlign: 'center', paddingVertical: 12 }]}>Saldo en Mano · 0.3.0 · Pruebas de desarrollo</Text>
  </View>;
}
