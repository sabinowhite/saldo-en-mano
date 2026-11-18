import { DateField } from '../components/DateField';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { FinanceState, Settings as SettingsType, contributions, money, parseMoney, localDate } from '../domain/finance';
import { nextScheduled } from '../domain/schedule';
import { SecurityControls } from '../components/SecurityControls';
import { Button, Card, Chip, Heading, Icon, Notice, colors, ui } from '../components/ui';
export function Settings({ state, mode, onSave, onOpeningSave, onExpectedSave, onReset, onDemo, onLeaveDemo, onRestore }: { state: FinanceState; mode: 'demo' | 'local'; onSave: (s: SettingsType) => Promise<void>; onOpeningSave: (opening: FinanceState['opening']) => Promise<void>; onExpectedSave: (id: string, cents: number, date: string) => Promise<void>; onReset: () => void; onDemo: () => void; onLeaveDemo: () => void; onRestore: (state: FinanceState) => Promise<void> }) {
  const [openingDate, setOpeningDate] = useState(state.opening.date);
  const [bank, setBank] = useState(String(state.opening.bankCents / 100));
  const [cash, setCash] = useState(String(state.opening.cashCents / 100));
  const [openingSaving, setOpeningSaving] = useState(false);
  const [openingMessage, setOpeningMessage] = useState('');
  async function saveOpening() {
    if (openingSaving) return;
    const amount = (value: string) => /^0(?:[.,]0{1,2})?$/.test(value.trim()) ? 0 : parseMoney(value);
    const bankCents = amount(bank), cashCents = amount(cash);
    if (bankCents === null || cashCents === null) { setOpeningMessage('Escribe saldos válidos, mayores o iguales a cero.'); return; }
    setOpeningSaving(true); setOpeningMessage('');
    try {
      await onOpeningSave({ date: openingDate, bankCents, cashCents });
      setOpeningMessage('Saldos de apertura guardados. Los saldos actuales se recalcularon conservando tus movimientos.');
    } catch (e) { setOpeningMessage(e instanceof Error ? e.message : 'No se pudieron guardar los saldos.'); }
    finally { setOpeningSaving(false); }
  }
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
    <Card><View style={ui.row}><Icon name="cash-outline" /><Text style={ui.h2}>Tu ingreso habitual</Text></View><Text style={ui.small}>Configúralo una vez. Solo el ingreso confirmado aumenta el saldo.</Text><Text style={ui.h3}>Monto en pesos</Text><TextInput accessibilityLabel="Monto del ingreso habitual" style={ui.input} keyboardType="decimal-pad" value={salary} onChangeText={setSalary} maxLength={12} /><Text style={ui.h3}>Frecuencia</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{([{ key: 'weekly', label: 'Semanal' }, { key: 'fortnightly', label: 'Quincenal' }, { key: 'monthly', label: 'Mensual' }] as const).map(f => <Chip key={f.key} label={f.label} selected={frequency === f.key} onPress={() => setFrequency(f.key)} />)}</View><Text style={ui.h3}>Fecha base de ingresos</Text><DateField label="Próxima fecha de ingreso" value={incomeDate} onChange={setIncomeDate} /></Card>
    <Card><View style={ui.row}><Icon name="heart-outline" /><Text style={ui.h2}>Tus aportaciones</Text></View><Text style={ui.small}>Diezmo: 10 % del ingreso. La ofrenda también se calcula sobre el ingreso.</Text><Text style={ui.h3}>Porcentaje de ofrenda</Text><TextInput accessibilityLabel="Porcentaje de ofrenda sobre el ingreso" style={ui.input} keyboardType="decimal-pad" value={offering} onChangeText={setOffering} maxLength={6} /><View style={ui.spread}><Text style={ui.body}>Diezmo estimado</Text><Text style={ui.h3}>{money(preview.tithe)}</Text></View><View style={ui.spread}><Text style={ui.body}>Ofrenda estimada</Text><Text style={ui.h3}>{money(preview.offering)}</Text></View><Text style={ui.small}>Esta vista previa no crea apartados ni modifica los ya confirmados.</Text></Card>
    {!valid && <Notice>Escribe un ingreso mayor que cero y una ofrenda entre 0 y 100 %, con hasta dos decimales.</Notice>}
    <Button label={saving ? 'Guardando…' : mode === 'demo' ? 'Aplicar a la demostración' : 'Guardar configuración'} onPress={save} disabled={!valid || saving} />
    {!!saveError && <Text accessibilityLiveRegion="polite" style={{ color: colors.red }}>{saveError}</Text>}
    {!!feedback && <Text accessibilityLiveRegion="polite" style={[ui.small, { color: colors.primary }]}>{feedback}</Text>}
    <Heading title="Ingresos esperados" subtitle="Corrige cada previsión. Los ingresos recibidos se corrigen desde Movimientos." />
    {(state.expectedIncomes ?? []).filter(e => e.receivedCents < e.cents).map(e => <ExpectedIncomeEditor key={e.id} income={e} onSave={onExpectedSave} />)}
    {mode === 'local' && <SecurityControls state={state} onRestore={onRestore} />}
    <Card><Heading title="Saldos de apertura" subtitle="Tu dinero antes del primer movimiento que registrarás." />
      <Text style={ui.small}>Si capturarás gastos desde el día 16, indica lo que tenías al comenzar ese día, antes de retiros, ingresos y gastos. Corregir la apertura no cuenta como ingreso ni borra movimientos.</Text>
      <Text style={ui.h3}>Fecha de apertura</Text><DateField label="Fecha de apertura" value={openingDate} onChange={setOpeningDate} maximumDate={localDate()} />
      <Text style={ui.h3}>Saldo inicial en banco</Text><TextInput accessibilityLabel="Saldo de apertura en banco" style={ui.input} keyboardType="decimal-pad" value={bank} onChangeText={setBank} maxLength={12} />
      <Text style={ui.h3}>Saldo inicial en efectivo</Text><TextInput accessibilityLabel="Saldo de apertura en efectivo" style={ui.input} keyboardType="decimal-pad" value={cash} onChangeText={setCash} maxLength={12} />
      <Button label={openingSaving ? 'Guardando saldos…' : 'Guardar saldos de apertura'} onPress={saveOpening} disabled={openingSaving} />
      {!!openingMessage && <Text accessibilityLiveRegion="polite" style={ui.small}>{openingMessage}</Text>}
    </Card>
    <Notice>Versión de prueba: utiliza datos ficticios hasta completar las pruebas en dispositivos y la recuperación de respaldos.</Notice>
    {mode === 'demo' ? <><Button label="Reiniciar datos de ejemplo" onPress={onReset} secondary icon="refresh-outline" /><Button label="Salir de la demostración" onPress={onLeaveDemo} secondary /></> : <Button label="Explorar demostración sin modificar mis datos" onPress={onDemo} secondary />}
    <Text style={[ui.small, { textAlign: 'center', paddingVertical: 12 }]}>Saldo en Mano · 0.3.3 · Pruebas de desarrollo</Text>
  </View>;
}

function ExpectedIncomeEditor({ income, onSave }: { income: NonNullable<FinanceState['expectedIncomes']>[number]; onSave: (id: string, cents: number, date: string) => Promise<void> }) {
  const [amount, setAmount] = useState(String(income.cents / 100));
  const [date, setDate] = useState(income.date);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save() {
    const cents = parseMoney(amount);
    if (busy) return;
    if (cents === null) { setMessage('Escribe un monto mayor que cero.'); return; }
    setBusy(true); setMessage('');
    try { await onSave(income.id, cents, date); setMessage('Ingreso esperado actualizado. El dinero recibido se conserva.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }
  return <Card><Text style={ui.h3}>Ingreso previsto</Text><Text style={ui.small}>Recibido: {money(income.receivedCents)}. El monto previsto incluye lo ya recibido. Esta edición no modifica la frecuencia de los siguientes ingresos.</Text><Text style={ui.h3}>Monto total esperado</Text><TextInput accessibilityLabel="Monto total del ingreso esperado" style={ui.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={12} /><Text style={ui.h3}>Fecha esperada</Text><DateField label="Fecha del ingreso esperado" value={date} onChange={setDate} /><Button label={busy ? 'Guardando…' : 'Guardar ingreso esperado'} onPress={save} disabled={busy} />{!!message && <Text accessibilityLiveRegion="polite" style={ui.small}>{message}</Text>}</Card>;
}
