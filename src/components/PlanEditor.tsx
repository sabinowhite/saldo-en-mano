import { DateField } from './DateField';
import { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { actionWarning, contributions, deliveredReserve, localDate, money, parseMoney, period } from '../domain/finance';
import type { Account, Action, FinanceState } from '../domain/finance';
import { nextScheduled, repeatLabels } from '../domain/schedule';
import type { Repeat } from '../domain/schedule';
import { Button, Card, Chip, Notice, colors, ui } from './ui';
import { SheetFrame } from './SheetFrame';
export type PlanSheet = { kind: 'plan'; entity: 'reserve' | 'payment' | 'template' | 'debt' | 'contributions'; id?: string };
const amountOrZero = (s: string) => /^0(?:[.,]0{1,2})?$/.test(s.trim()) ? 0 : parseMoney(s);
function Field({ label, value, onChange, amount = false }: { label: string; value: string; onChange: (s: string) => void; amount?: boolean }) {
  return <><Text style={ui.h3}>{label}</Text><TextInput accessibilityLabel={label} style={ui.input} value={value} onChangeText={onChange} keyboardType={amount ? 'decimal-pad' : 'default'} maxLength={amount ? 12 : 100} /></>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) { return <View style={ui.spread}><Text style={[ui.body, { flex: 1 }]}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} /></View>; }
export function PlanEditor({ sheet, state, onSubmit, onClose }: { sheet: PlanSheet; state: FinanceState; onSubmit: (a: Action) => Promise<void>; onClose: () => void }) {
  const existing = sheet.entity === 'reserve' ? state.reserves.find(r => r.id === sheet.id) : sheet.entity === 'payment' ? state.payments.find(r => r.id === sheet.id) : sheet.entity === 'template' ? (state.templates ?? []).find(r => r.id === sheet.id) : state.debts.find(r => r.id === sheet.id);
  const currentIncome = state.entries.filter(e => e.kind === 'income' && period(e.date) === period(localDate())).reduce((sum, e) => sum + e.cents, 0);
  const [id] = useState(() => sheet.id ?? randomUUID());
  const [concept, setConcept] = useState(existing?.concept ?? '');
  const [amount, setAmount] = useState(String((existing?.cents ?? (sheet.entity === 'contributions' ? currentIncome || state.settings.salaryCents : 0)) / 100));
  const [account, setAccount] = useState<Account>(existing && 'account' in existing ? existing.account : 'bank');
  const [date, setDate] = useState(existing && 'nextDate' in existing ? existing.nextDate : existing && 'date' in existing && existing.date ? existing.date : localDate());
  const [creditor, setCreditor] = useState(existing && 'creditor' in existing ? existing.creditor : '');
  const [monthly, setMonthly] = useState(String((existing && 'monthlyCents' in existing ? existing.monthlyCents : 0) / 100));
  const [nextCharge, setNextCharge] = useState(existing && 'nextChargeDate' in existing && existing.nextChargeDate ? existing.nextChargeDate : nextScheduled(localDate(), 'monthly') ?? localDate());
  const [frequency, setFrequency] = useState<Repeat>(existing && 'frequency' in existing ? existing.frequency : 'monthly');
  const [reserve, setReserve] = useState(existing && 'reserved' in existing ? existing.reserved : false);
  const [variable, setVariable] = useState(existing && 'variable' in existing ? existing.variable : false);
  const [enabled, setEnabled] = useState(existing && 'enabled' in existing ? existing.enabled : true);
  const [reminder, setReminder] = useState(existing && 'reminder' in existing ? existing.reminder : true);
  const [offering, setOffering] = useState(String(state.settings.offeringPercent));
  const [review, setReview] = useState<{ action: Action; warning: string | null; summary: string } | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const names = { reserve: 'Apartado', payment: 'Pago pendiente', template: 'Pago programado', debt: 'Deuda', contributions: 'Diezmo y ofrenda' };
  function stage(action: Action, summary: string) {
    try { setError(''); setReview({ action, summary, warning: actionWarning(state, action) }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Revisa los datos.'); }
  }
  function prepare() {
    const cents = amountOrZero(amount);
    if (cents === null) return setError('Escribe un monto válido, sin separadores de miles.');
    if (sheet.entity === 'contributions') {
      const percent = /^\d{1,3}(?:[.,]\d{1,2})?$/.test(offering) ? Number(offering.replace(',', '.')) : NaN;
      try {
        const calculated = contributions(cents, percent);
        const reserves = [{ id: id + ':tithe', concept: 'Diezmo', cents: calculated.tithe, account, date, delivered: false }, { id: id + ':offering', concept: 'Ofrenda', cents: calculated.offering, account, date, delivered: false }].filter(r => r.cents > 0);
        if (!reserves.length) return setError('El ingreso base debe producir un apartado mayor que cero.');
        stage({ type: 'save-reserves', reserves }, `Apartar diezmo ${money(calculated.tithe)} y ofrenda ${money(calculated.offering)}. No se registra una salida hasta entregarlos.`);
      } catch { setError('Revisa el ingreso y el porcentaje de ofrenda (0 a 100).'); }
    } else if (sheet.entity === 'reserve') stage({ type: 'save-reserves', reserves: [{ id, concept: concept.trim(), cents, account, date, delivered: false }] }, `Apartado ${concept}: ${money(cents)} en ${account === 'bank' ? 'banco' : 'efectivo'}.`);
    else if (sheet.entity === 'payment') stage({ type: 'save-payment', payment: { id, concept: concept.trim(), cents, account, date, reserved: reserve, paid: false, templateId: existing && 'templateId' in existing ? existing.templateId : undefined } }, `Pago pendiente ${concept}: ${money(cents)}. ${reserve ? 'Se apartará del disponible.' : 'Solo queda como pendiente.'}`);
    else if (sheet.entity === 'template') stage({ type: 'save-template', today: localDate(), template: { id, concept: concept.trim(), cents, account, reserved: reserve, variable, frequency, nextDate: date, anchorDay: Number(date.slice(8)), enabled, reminder } }, `Programación ${repeatLabels[frequency]}: ${concept}. ${existing ? 'Los pendientes anteriores conservan sus datos.' : 'El primer pendiente aparecerá de inmediato.'} El pago siempre se confirma manualmente.`);
    else {
      const monthlyCents = amountOrZero(monthly);
      if (monthlyCents === null) return setError('Revisa el cargo mensual. Usa 0 si la deuda no aumenta.');
      stage({ type: 'save-debt', date, today: localDate(), operationId: randomUUID(), debt: { id, concept: concept.trim(), creditor: creditor.trim(), cents, monthlyCents, nextChargeDate: monthlyCents ? nextCharge : undefined, anchorDay: Number(nextCharge.slice(8)) } }, `${existing ? 'Ajustar' : 'Registrar'} saldo de ${concept}: ${money(cents)}. Esta operación no descuenta dinero de banco o efectivo.`);
    }
  }
  async function save() {
    if (!review || busy) return;
    setBusy(true); setError('');
    try { await onSubmit(review.action); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar. Intenta nuevamente.'); } finally { setBusy(false); }
  }
  const spent = existing && 'delivered' in existing ? deliveredReserve(existing) : 0;
  return <SheetFrame title={`${existing ? 'Editar' : 'Nuevo'} ${names[sheet.entity].toLowerCase()}`} busy={busy} onClose={onClose}>
    {review ? <><Card><Text style={ui.body}>{review.summary}</Text></Card>{review.warning && <Notice>{review.warning}</Notice>}<Button label={busy ? 'Guardando…' : review.warning ? 'Guardar de todos modos' : 'Confirmar y guardar'} disabled={busy} onPress={save} /><Button label="Volver y corregir" secondary disabled={busy} onPress={() => setReview(null)} /></> : <>
      {sheet.entity !== 'contributions' && <Field label="Concepto" value={concept} onChange={setConcept} />}
      {sheet.entity === 'debt' && <Field label="A quién le debes" value={creditor} onChange={setCreditor} />}
      <Field label={sheet.entity === 'contributions' ? 'Ingreso base en pesos' : sheet.entity === 'debt' ? 'Saldo actual de la deuda' : sheet.entity === 'reserve' ? 'Monto total del apartado' : 'Monto previsto en pesos'} value={amount} onChange={setAmount} amount />
      {spent > 0 && <Notice>Ya entregaste {money(spent)}. El total del apartado no puede ser menor que esa cantidad.</Notice>}
      {sheet.entity === 'contributions' && <><Field label="Porcentaje de ofrenda sobre el ingreso" value={offering} onChange={setOffering} amount /><Text style={ui.small}>El diezmo es 10 %. La ofrenda se calcula sobre el ingreso, no sobre el diezmo.</Text></>}
      {sheet.entity !== 'debt' && <><Text style={ui.h3}>Origen del dinero</Text><View style={ui.row}><Chip label="Banco" selected={account === 'bank'} onPress={() => setAccount('bank')} /><Chip label="Efectivo" selected={account === 'cash'} onPress={() => setAccount('cash')} /></View></>}
      <Text style={ui.h3}>{sheet.entity === 'template' ? 'Próxima fecha' : 'Fecha'}</Text><DateField label={sheet.entity === 'template' ? 'Próxima fecha' : 'Fecha'} value={date} onChange={setDate} />
      {(sheet.entity === 'payment' || sheet.entity === 'template') && <Toggle label="Apartar del saldo disponible" value={reserve} onChange={setReserve} />}
      {sheet.entity === 'template' && <><Text style={ui.h3}>Frecuencia</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{(Object.keys(repeatLabels) as Repeat[]).map(key => <Chip key={key} label={repeatLabels[key]} selected={frequency === key} onPress={() => setFrequency(key)} />)}</View><Toggle label="Monto variable (puedes dejar 0)" value={variable} onChange={setVariable} /><Toggle label="Programación activa" value={enabled} onChange={setEnabled} /><Toggle label="Recordatorio de pago" value={reminder} onChange={setReminder} /></>}
      {sheet.entity === 'debt' && <><Field label="Incremento mensual (0 si no aplica)" value={monthly} onChange={setMonthly} amount /><Text style={ui.h3}>Próximo cargo mensual</Text><DateField label="Próximo cargo mensual" value={nextCharge} onChange={setNextCharge} />{existing && <Notice>Si cambias el saldo, quedará un ajuste en el estado de cuenta. Para registrar un pago utiliza «Abonar».</Notice>}</>}
      <Button label="Revisar datos" onPress={prepare} />
      {existing && sheet.entity === 'reserve' && <Button label="Cancelar saldo pendiente del apartado" secondary onPress={() => stage({ type: 'cancel-reserve', id }, 'Se liberará lo pendiente del apartado. Las entregas anteriores permanecerán en el historial.')} />}
      {existing && sheet.entity === 'payment' && <Button label="Cancelar este pago pendiente" secondary onPress={() => stage({ type: 'cancel-payment', id }, 'Se cancelará este pendiente y se liberará su reserva. No se eliminará la programación de pagos futuros.')} />}
    </>}
    {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.red }}>{error}</Text>}
  </SheetFrame>;
}
