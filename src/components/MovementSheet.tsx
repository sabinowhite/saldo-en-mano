import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Account, Action, Entry, FinanceState, actionWarning, localDate, money, parseMoney, period, remainingReserve, validDate } from '../domain/finance';
import { Button, Chip, Notice, ui, colors } from './ui';
import { SheetFrame } from './SheetFrame';
export type MovementSheetValue = { kind: Entry['kind'] } | { kind: 'debt' | 'payment' | 'deliver' | 'expected-income' | 'edit' | 'delete'; id: string } | { kind: 'reset' };
export function MovementSheet({ sheet, state, onClose, onSubmit, onReset, newId, mode }: { mode: 'demo' | 'local'; sheet: MovementSheetValue; state: FinanceState; onClose: () => void; onSubmit: (a: Action) => Promise<void>; onReset: () => void; newId: () => string }) {
  const old = sheet.kind === 'edit' || sheet.kind === 'delete' ? state.entries.find(e => e.id === sheet.id) : null;
  const fixed = sheet.kind === 'payment' ? state.payments.find(p => p.id === sheet.id) : sheet.kind === 'deliver' ? state.reserves.find(r => r.id === sheet.id) : null;
  const debt = sheet.kind === 'debt' ? state.debts.find(d => d.id === sheet.id) : null;
  const expected = sheet.kind === 'expected-income' ? (state.expectedIncomes ?? []).find(e => e.id === sheet.id) : null;
  const initial = old?.cents ?? (fixed ? ('delivered' in fixed ? remainingReserve(fixed) : fixed.cents) : expected ? Math.max(0, expected.cents - expected.receivedCents) : sheet.kind === 'income' ? state.settings.salaryCents : 0);
  const [amount, setAmount] = useState(initial ? String(initial / 100) : '');
  const [concept, setConcept] = useState(old?.concept ?? (sheet.kind === 'income' ? 'Ingreso recibido' : ''));
  const [date, setDate] = useState(old?.date ?? localDate());
  const [account, setAccount] = useState<Account>(old?.account ?? fixed?.account ?? (sheet.kind === 'expense' ? 'cash' : 'bank'));
  const [entryKind, setEntryKind] = useState<Entry['kind']>(old?.kind ?? 'expense');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ action: Action; warning: string | null; summary: string } | null>(null);
  const title = sheet.kind === 'expense' ? 'Registrar gasto' : sheet.kind === 'income' ? 'Confirmar ingreso recibido' : sheet.kind === 'transfer' ? 'Transferir dinero' : sheet.kind === 'debt' ? 'Abonar a una deuda' : sheet.kind === 'expected-income' ? 'Confirmar ingreso esperado' : sheet.kind === 'reset' ? 'Reiniciar demostración' : sheet.kind === 'payment' ? 'Confirmar pago' : sheet.kind === 'edit' ? 'Editar movimiento' : sheet.kind === 'delete' ? 'Eliminar movimiento' : 'Confirmar entrega';
  function prepare() {
    setError('');
    if (sheet.kind === 'reset') return;
    if (!validDate(date)) return setError('Escribe una fecha válida con formato AAAA-MM-DD.');
    const cents = parseMoney(amount);
    if (!cents) return setError('Escribe un monto mayor que cero, con hasta dos decimales y sin separadores de miles.');
    const id = newId(); let action: Action;
    if (sheet.kind === 'delete') {
      if (!old) return;
      action = { type: 'delete-entry', id: old.id, operationId: id, today: localDate() };
    } else if (sheet.kind === 'edit') {
      if (!old) return;
      action = { type: 'edit-entry', entry: { ...old, kind: entryKind, concept: concept.trim(), cents, account, date }, operationId: id, today: localDate() };
    } else if (sheet.kind === 'expected-income') action = { type: 'receive-expected', id: sheet.id, entryId: id, cents, account, date };
    else if (sheet.kind === 'payment' || sheet.kind === 'deliver') action = { type: sheet.kind, id: sheet.id, entryId: id, date, cents, account };
    else if (sheet.kind === 'debt') action = { type: 'debt', id: sheet.id, entryId: id, cents, account, date };
    else action = { type: 'entry', entry: { id, kind: sheet.kind, cents, account, concept: concept.trim() || (sheet.kind === 'transfer' ? 'Transferencia entre banco y cartera' : ''), date } };
    try { setConfirm({ action, warning: actionWarning(state, action), summary: `${sheet.kind === 'delete' ? 'Eliminar' : sheet.kind === 'edit' ? 'Corregir a' : 'Registrar'} ${money(cents)} · ${old?.concept ?? fixed?.concept ?? debt?.concept ?? concept}. Se actualizarán los saldos relacionados.` }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Revisa el movimiento.'); }
  }
  async function commit() {
    if (!confirm || saving) return;
    setSaving(true); setError('');
    try { await onSubmit(confirm.action); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar. Intenta nuevamente.'); }
    finally { setSaving(false); }
  }
  return <SheetFrame title={title} busy={saving} onClose={onClose}>
    {sheet.kind === 'reset' ? <><Text style={ui.body}>Se descartarán los cambios de esta demostración. La información personal guardada no se modifica.</Text><Button label="Reiniciar datos de ejemplo" onPress={onReset} /><Button label="Conservar mis cambios" secondary onPress={onClose} /></> : confirm ? <>
      <Text style={ui.body}>{confirm.summary}</Text><Text style={ui.small}>Fecha: {date.split('-').reverse().join('/')}</Text>
      {confirm.warning && <Notice>{confirm.warning}</Notice>}
      {period(date) !== period(localDate()) && <Notice>El movimiento pertenece a otra quincena y actualizará sus saldos acumulados.</Notice>}
      <Notice>{mode === 'demo' ? 'Simulación: no se guardan datos al cerrar.' : 'Solo se guarda el registro. La app no realiza pagos bancarios.'}</Notice>
      <Button label={saving ? 'Guardando…' : confirm.warning ? 'Continuar de todos modos' : 'Confirmar cambio'} disabled={saving} onPress={commit} />
      <Button label="Volver y revisar" secondary disabled={saving} onPress={() => setConfirm(null)} />
    </> : sheet.kind === 'delete' ? <><Text style={ui.body}>Eliminar {old?.concept} por {money(old?.cents ?? 0)}. Se revertirá su efecto en los saldos y en el apartado, pago o deuda relacionados. Quedará constancia de la corrección.</Text><Button label="Revisar eliminación" onPress={prepare} /><Button label="Conservar movimiento" secondary onPress={onClose} /></> : <>
      {(fixed || debt) && <Text style={ui.h3}>{fixed?.concept ?? debt?.concept} · {money(initial)}</Text>}
      {sheet.kind === 'edit' && !old?.link && <View style={ui.row}>{([{ key: 'expense', label: 'Gasto' }, { key: 'income', label: 'Ingreso' }, { key: 'transfer', label: 'Retiro' }] as const).map(k => <Chip key={k.key} label={k.label} selected={entryKind === k.key} onPress={() => setEntryKind(k.key)} />)}</View>}
      <Text style={ui.h3}>Monto en pesos</Text><TextInput autoFocus accessibilityLabel="Monto del movimiento" style={[ui.input, { fontSize: 26 }]} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} maxLength={12} />
      {!fixed && !debt && !expected && <><Text style={ui.h3}>Concepto</Text><TextInput accessibilityLabel="Concepto del movimiento" style={ui.input} value={concept} onChangeText={setConcept} maxLength={100} /></>}
      <Text style={ui.h3}>{sheet.kind === 'income' ? 'Recibir en' : 'Sale de'}</Text><View style={ui.row}><Chip label="Banco" selected={account === 'bank'} onPress={() => setAccount('bank')} /><Chip label="Efectivo" selected={account === 'cash'} onPress={() => setAccount('cash')} /></View>
      <Text style={ui.h3}>Fecha (AAAA-MM-DD)</Text><TextInput accessibilityLabel="Fecha del movimiento" style={ui.input} value={date} onChangeText={setDate} maxLength={10} />
      {sheet.kind === 'deliver' && <Text style={ui.small}>Puedes entregar todo o una parte del importe pendiente.</Text>}
      {sheet.kind === 'payment' && <Text style={ui.small}>Confirma el monto real y de dónde salió. Puede ser diferente del monto previsto.</Text>}
      <Button label="Revisar movimiento" onPress={prepare} />
    </>}
    {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.red }}>{error}</Text>}
  </SheetFrame>;
}
