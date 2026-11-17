import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Account, Action, Entry, FinanceState, localDate, money, parseMoney, period, spendWarning, validDate } from '../domain/finance';
import { Button, Chip, Heading, Icon, Notice, ui, colors } from './ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export type Sheet = { kind: Entry['kind'] } | { kind: 'debt'; id: string } | { kind: 'payment' | 'deliver'; id: string } | { kind: 'reset' };
export function MovementSheet({ sheet, state, onClose, onSubmit, onReset, newId, mode }: { mode: 'demo' | 'local'; sheet: Sheet; state: FinanceState; onClose: () => void; onSubmit: (a: Action) => Promise<void>; onReset: () => void; newId: () => string }) {
  const inset = useSafeAreaInsets();
  const [amount, setAmount] = useState(sheet.kind === 'income' ? String(state.settings.salaryCents / 100) : '');
  const [concept, setConcept] = useState(sheet.kind === 'income' ? 'Ingreso recibido' : '');
  const [date, setDate] = useState(localDate());
  const [account, setAccount] = useState<Account>(sheet.kind === 'expense' ? 'cash' : 'bank');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ action: Action; warning: string | null; summary: string } | null>(null);
  const fixed = sheet.kind === 'payment' ? state.payments.find(p => p.id === sheet.id) : sheet.kind === 'deliver' ? state.reserves.find(r => r.id === sheet.id) : null;
  const debt = sheet.kind === 'debt' ? state.debts.find(d => d.id === sheet.id) : null;
  const title = sheet.kind === 'expense' ? 'Registrar gasto' : sheet.kind === 'income' ? 'Confirmar ingreso recibido' : sheet.kind === 'transfer' ? 'Transferir dinero' : sheet.kind === 'debt' ? 'Abonar a una deuda' : sheet.kind === 'reset' ? 'Reiniciar demostración' : sheet.kind === 'payment' ? 'Confirmar pago' : 'Confirmar entrega';
  function prepare() {
    setError('');
    if (date < state.opening.date) return setError('La fecha no puede ser anterior a tus saldos iniciales.');
    if (!validDate(date)) return setError('Escribe una fecha válida: AAAA-MM-DD, entre 2000 y 2100.');
    if (sheet.kind === 'payment' || sheet.kind === 'deliver') {
      if (!fixed) return;
      const released = sheet.kind === 'deliver' || ('reserved' in fixed && fixed.reserved) ? fixed.cents : 0;
      const action: Action = { type: sheet.kind, id: sheet.id, entryId: newId(), date };
      setConfirm({ action, summary: `${fixed.concept} · ${money(fixed.cents)} desde ${fixed.account === 'bank' ? 'banco' : 'efectivo'}.`, warning: spendWarning(state, fixed.account, fixed.cents, released) });
      return;
    }
    const cents = parseMoney(amount);
    if (!cents) return setError('Escribe un monto mayor que cero, con hasta dos decimales y sin separadores de miles.');
    if (sheet.kind === 'debt' && debt && cents > debt.cents) return setError('El abono no puede ser mayor que el saldo de la deuda.');
    if (sheet.kind === 'reset') return;
    if (sheet.kind !== 'debt' && sheet.kind !== 'transfer' && !concept.trim()) return setError('Agrega un concepto para identificar el movimiento.');
    const action: Action = sheet.kind === 'debt' ? { type: 'debt', id: sheet.id, cents, account, entryId: newId(), date } : { type: 'entry', entry: { id: newId(), kind: sheet.kind, cents, account, concept: concept.trim() || 'Transferencia entre banco y cartera', date } };
    const warning = sheet.kind === 'income' ? null : spendWarning(state, account, cents);
    setConfirm({ action, warning, summary: `${money(cents)} · ${sheet.kind === 'income' ? 'Entrada a' : 'Salida de'} ${account === 'bank' ? 'banco' : 'efectivo'}${sheet.kind === 'transfer' ? ' hacia ' + (account === 'bank' ? 'efectivo' : 'banco') : ''}.` });
  }
  async function commit() {
    if (!confirm || saving) return;
    setSaving(true); setError('');
    try { await onSubmit(confirm.action); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar. Intenta nuevamente.'); }
    finally { setSaving(false); }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#0C282866', justifyContent: 'flex-end' }}>
      <View style={{ maxHeight: '92%', width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: Math.max(24, inset.bottom + 12), gap: 16 }}>
          <View style={ui.spread}><Heading title={title} /><Pressable accessibilityRole="button" accessibilityLabel="Cerrar formulario" disabled={saving} onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" /></Pressable></View>
          {sheet.kind === 'reset' ? <><Text style={ui.body}>Se descartarán los cambios de esta sesión y se cargarán los importes de ejemplo.</Text><Button label="Reiniciar datos de ejemplo" onPress={onReset} /><Button label="Conservar mis cambios" secondary onPress={onClose} /></> : confirm ? <>
            <Text style={ui.body}>{confirm.summary}</Text><Text style={ui.small}>Fecha: {date.split('-').reverse().join('/')}</Text>
            {confirm.warning && <Notice>{confirm.warning}</Notice>}
            {period(date) !== period(localDate()) && <Notice>Este movimiento pertenece a otra quincena. Actualizará sus movimientos y los saldos acumulados.</Notice>}
            <Notice>{mode === 'demo' ? 'Simulación: no se realizará ningún pago bancario ni se guardarán datos al cerrar.' : 'Se guardará el registro en este teléfono. La app no hace transferencias ni pagos bancarios.'}</Notice>
            {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.red }}>{error}</Text>}
            <Button label={saving ? 'Guardando…' : confirm.warning ? 'Continuar de todos modos' : 'Confirmar movimiento'} disabled={saving} onPress={commit} />
            <Button label="Volver y revisar" secondary disabled={saving} onPress={() => setConfirm(null)} />
          </> : <>
            {(fixed || debt) && <Text style={ui.h3}>{fixed?.concept ?? debt?.concept} · {money(fixed?.cents ?? debt?.cents ?? 0)}</Text>}
            {!fixed && <><Text style={ui.h3}>Monto en pesos</Text><TextInput autoFocus accessibilityLabel="Monto del movimiento" style={[ui.input, { fontSize: 26 }]} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} maxLength={12} />
              {sheet.kind !== 'debt' && <><Text style={ui.h3}>Concepto{sheet.kind === 'transfer' ? ' (opcional)' : ''}</Text><TextInput accessibilityLabel="Concepto del movimiento" style={ui.input} placeholder={sheet.kind === 'transfer' ? 'Transferencia a cartera' : '¿De qué fue?'} placeholderTextColor={colors.muted} value={concept} onChangeText={setConcept} maxLength={80} /></>}
              <Text style={ui.h3}>{sheet.kind === 'income' ? 'Recibir en' : 'Sale de'}</Text><View style={ui.row}><Chip label="Banco" selected={account === 'bank'} onPress={() => setAccount('bank')} /><Chip label="Efectivo" selected={account === 'cash'} onPress={() => setAccount('cash')} /></View>
              {sheet.kind === 'transfer' && <Text style={ui.small}>Llegará a {account === 'bank' ? 'tu cartera en efectivo' : 'tu cuenta bancaria'}. No se contará como gasto.</Text>}
            </>}
            <Text style={ui.h3}>Fecha</Text><TextInput accessibilityLabel="Fecha del movimiento, año mes día" style={ui.input} placeholder="AAAA-MM-DD" value={date} onChangeText={setDate} maxLength={10} />
            {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.red }}>{error}</Text>}
            <Button label="Revisar movimiento" onPress={prepare} />
          </>}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
