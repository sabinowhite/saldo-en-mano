import { useState } from 'react';
import { Text, View } from 'react-native';
import { FinanceState, deliveredReserve, money, remainingReserve } from '../domain/finance';
import { repeatLabels } from '../domain/schedule';
import { Card, Chip, Button, Heading, Notice, ui, colors } from '../components/ui';
import type { PlanSheet } from '../components/PlanEditor';
type Props = { state: FinanceState; onDeliver: (id: string) => void; onPay: (id: string) => void; onDebt: (id: string) => void; onEdit: (entity: PlanSheet['entity'], id?: string) => void; onEntry: (id: string) => void };
export function Plans({ state, onDeliver, onPay, onDebt, onEdit, onEntry }: Props) {
  const [section, setSection] = useState('Apartados');
  const [history, setHistory] = useState(false);
  const [statement, setStatement] = useState<string | null>(null);
  return <View style={{ gap: 20 }}><Heading title="Tu plan financiero" subtitle="Anticípate a lo que viene." /><View style={ui.row}>{['Apartados', 'Pagos', 'Deudas'].map(s => <Chip key={s} label={s} selected={s === section} onPress={() => setSection(s)} />)}</View>
    {section === 'Apartados' && <>
      <Card><Text style={ui.h2}>Dinero con un propósito</Text><Text style={[ui.amount, { fontSize: 30 }]}>{money(state.reserves.reduce((s, r) => s + remainingReserve(r), 0))}</Text><Text style={ui.small}>Pendiente de entregar</Text><Text style={ui.small}>Entregado: {money(state.reserves.reduce((s, r) => s + deliveredReserve(r), 0))}</Text></Card>
      <Button label="Calcular diezmo y ofrenda" icon="heart-outline" onPress={() => onEdit('contributions')} />
      <Button label="Agregar otro apartado" secondary icon="add" onPress={() => onEdit('reserve')} />
      {!state.reserves.length && <Notice>Agrega los conceptos que quieras apartar. Reservar dinero no es un gasto; entregarlo sí registra la salida.</Notice>}
      {state.reserves.map(r => <Card key={r.id}><View style={ui.spread}><View style={ui.flex}><Text style={ui.h3}>{r.concept}</Text><Text style={ui.small}>{r.cancelled ? 'Cancelado' : r.delivered ? 'Entregado' : `Apartado en ${r.account === 'bank' ? 'banco' : 'efectivo'}`}</Text></View><Text style={ui.amount}>{money(remainingReserve(r))}</Text></View><Text style={ui.small}>Total: {money(r.cents)} · Entregado: {money(deliveredReserve(r))}</Text><Button label="Registrar entrega" secondary disabled={r.delivered || r.cancelled} onPress={() => onDeliver(r.id)} />{!r.cancelled && <Button label="Editar apartado" secondary onPress={() => onEdit('reserve', r.id)} />}</Card>)}
    </>}
    {section === 'Pagos' && <>
      <Button label="Programar un pago" icon="calendar-outline" onPress={() => onEdit('template')} />
      <Button label="Agregar pago único" secondary icon="add" onPress={() => onEdit('payment')} />
      <Heading title="Pendientes y realizados" />
      <View style={ui.row}><Chip label="Pendientes" selected={!history} onPress={() => setHistory(false)} /><Chip label="Historial" selected={history} onPress={() => setHistory(true)} /></View>
      {!state.payments.filter(p => history ? p.paid || p.cancelled : !p.paid && !p.cancelled).length && <Notice>{history ? 'Todavía no hay pagos realizados o cancelados.' : 'No tienes pagos pendientes registrados.'}</Notice>}
      {state.payments.filter(p => history ? p.paid || p.cancelled : !p.paid && !p.cancelled).sort((a, b) => a.date.localeCompare(b.date)).map(p => <Card key={p.id}><View style={ui.spread}><View style={ui.flex}><Text style={ui.h3}>{p.concept}</Text><Text style={ui.small}>{p.date.split('-').reverse().join('/')} · {p.account === 'bank' ? 'Banco' : 'Efectivo'}</Text></View><Text style={ui.amount}>{p.cents ? money(p.cents) : 'Variable'}</Text></View><Text style={[ui.small, { color: p.paid ? colors.primary : colors.warning }]}>{p.cancelled ? 'Cancelado' : p.paid ? 'Pagado' : p.reserved ? 'Pendiente · Dinero reservado' : 'Pendiente · Sin reserva'}</Text>{!p.paid && !p.cancelled && <><Button label="Registrar pago" secondary onPress={() => onPay(p.id)} /><Button label="Editar pendiente" secondary onPress={() => onEdit('payment', p.id)} /></>}{p.paid && state.entries.find(e => e.link?.kind === 'payment' && e.link.id === p.id) && <Button label="Corregir movimiento de pago" secondary onPress={() => onEntry(state.entries.find(e => e.link?.kind === 'payment' && e.link.id === p.id)!.id)} />}</Card>)}
      <Heading title="Tus programaciones" subtitle="Los pagos futuros conservan su propia fecha y confirmación." />
      {(state.templates ?? []).map(t => <Card key={t.id}><Text style={ui.h3}>{t.concept}</Text><Text style={ui.small}>{repeatLabels[t.frequency]} · {t.enabled ? `Próximo: ${t.nextDate.split('-').reverse().join('/')}` : 'Inactiva o finalizada'}</Text><Text style={ui.small}>{t.variable ? 'Monto editable al pagar' : money(t.cents)} · {t.reminder ? 'Con recordatorio' : 'Sin recordatorio'}</Text><Button label="Editar programación" secondary onPress={() => onEdit('template', t.id)} /></Card>)}
    </>}
    {section === 'Deudas' && <>
      <Card><Text style={ui.small}>Total por pagar</Text><Text style={[ui.amount, { fontSize: 30 }]}>{money(state.debts.reduce((s, d) => s + d.cents, 0))}</Text><Text style={ui.small}>Los cargos aumentan la deuda. Solo los abonos descuentan dinero de tus cuentas.</Text></Card>
      <Button label="Agregar deuda" icon="add" onPress={() => onEdit('debt')} />
      {!state.debts.length && <Notice>Registra a quién le debes, cuánto y si el saldo aumenta cada mes.</Notice>}
      {state.debts.map(d => {
        const events = [...(state.debtEvents ?? []).filter(e => e.debtId === d.id).map(e => ({ id: e.id, date: e.date, label: e.kind === 'opening' ? 'Saldo inicial' : e.kind === 'charge' ? 'Cargo mensual' : 'Ajuste de saldo', cents: e.cents })), ...state.entries.filter(e => e.link?.kind === 'debt' && e.link.id === d.id).map(e => ({ id: e.id, date: e.date, label: 'Abono', cents: -e.cents }))].sort((a, b) => a.date.localeCompare(b.date));
        return <Card key={d.id}><View style={ui.spread}><View style={ui.flex}><Text style={ui.h3}>{d.concept}</Text><Text style={ui.small}>{d.creditor}</Text></View><Text style={ui.amount}>{money(d.cents)}</Text></View><Text style={ui.small}>Incremento mensual: {money(d.monthlyCents)}{d.nextChargeDate ? ` · Próximo: ${d.nextChargeDate.split('-').reverse().join('/')}` : ''}</Text><Button label={d.cents ? 'Registrar abono' : 'Deuda saldada'} secondary disabled={!d.cents} onPress={() => onDebt(d.id)} /><Button label="Editar deuda" secondary onPress={() => onEdit('debt', d.id)} /><Button label={statement === d.id ? 'Cerrar estado de cuenta' : 'Ver estado de cuenta'} secondary onPress={() => setStatement(statement === d.id ? null : d.id)} />{statement === d.id && <>{!events.length && <Text style={ui.small}>Saldo registrado antes del desglose de movimientos.</Text>}{events.map(e => <View key={e.id} style={ui.spread}><View style={ui.flex}><Text style={ui.body}>{e.label}</Text><Text style={ui.small}>{e.date.split('-').reverse().join('/')}</Text></View><Text style={ui.h3}>{e.cents >= 0 ? '+' : '−'}{money(Math.abs(e.cents))}</Text></View>)}</>}</Card>;
      })}
    </>}
  </View>;
}
