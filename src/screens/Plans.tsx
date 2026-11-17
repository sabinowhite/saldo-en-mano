import { useState } from 'react';
import { Text, View } from 'react-native';
import { FinanceState, money } from '../domain/finance';
import { Card, Chip, Button, Heading, Icon, Notice, ui, colors } from '../components/ui';

type Props = { state: FinanceState; onDeliver: (id: string) => void; onPay: (id: string) => void; onDebt: (id: string) => void };
export function Plans({ state, onDeliver, onPay, onDebt }: Props) {
  const [section, setSection] = useState('Apartados');
  return <View style={{ gap: 20 }}><Heading title="Tu plan financiero" subtitle="Anticípate a lo que viene." /><View style={ui.row}>{['Apartados', 'Pagos', 'Deudas'].map(s => <Chip key={s} label={s} selected={s === section} onPress={() => setSection(s)} />)}</View>
    {section === 'Apartados' && <>
      <Card><View style={ui.row}><View style={ui.iconTile}><Icon name="heart-outline" /></View><View style={ui.flex}><Text style={ui.h3}>Diezmos y ofrendas</Text><Text style={ui.small}>Dinero con un propósito</Text></View></View><Text style={[ui.amount, { fontSize: 30 }]}>{money(state.reserves.filter(r => !r.delivered).reduce((s, r) => s + r.cents, 0))}</Text><Text style={ui.small}>Pendiente de entregar · Confirmación manual</Text></Card>
      {state.reserves.map(r => <Card key={r.id}><View style={ui.spread}><View style={ui.flex}><Text style={ui.h3}>{r.concept}</Text><Text style={ui.small}>{r.delivered ? 'Entregado' : 'Apartado en banco'}</Text></View><Text style={ui.amount}>{money(r.cents)}</Text></View><Button label={r.delivered ? 'Entrega registrada' : 'Marcar como entregado'} icon="checkmark-outline" secondary onPress={() => onDeliver(r.id)} disabled={r.delivered} /></Card>)}
      <Notice>Los apartados de ejemplo ya están confirmados. La captura de nuevos conceptos y la entrega parcial se incorporarán en la siguiente etapa.</Notice>
    </>}
    {section === 'Pagos' && <>
      <Notice>Prueba los pagos de ejemplo. En esta etapa no se envían notificaciones ni se generan nuevos periodos automáticamente.</Notice>
      {state.payments.map(p => <Card key={p.id}><View style={ui.row}><View style={ui.iconTile}><Icon name={p.id === 'card' ? 'card-outline' : 'wifi-outline'} /></View><View style={ui.flex}><Text style={ui.h3}>{p.concept}</Text><Text style={ui.small}>{p.date.split('-').reverse().join('/')} · Banco</Text></View><Text style={ui.amount}>{money(p.cents)}</Text></View><Text style={[ui.small, { color: p.paid ? colors.primary : colors.warning }]}>{p.paid ? 'Pagado · Ya está en tus movimientos' : p.reserved ? 'Pendiente · Dinero reservado' : 'Pendiente · Sin reserva de dinero'}</Text><Button label={p.paid ? 'Pago registrado' : 'Marcar como pagado'} secondary icon="checkmark-outline" disabled={p.paid} onPress={() => onPay(p.id)} /></Card>)}
    </>}
    {section === 'Deudas' && <>
      <Card><Text style={ui.small}>Total por pagar</Text><Text style={[ui.amount, { fontSize: 30 }]}>{money(state.debts.reduce((s, d) => s + d.cents, 0))}</Text><Text style={ui.small}>Las deudas no disminuyen tu dinero hasta registrar un abono.</Text></Card>
      {state.debts.map(d => <Card key={d.id}><View style={ui.spread}><View style={ui.flex}><Text style={ui.h3}>{d.concept}</Text><Text style={ui.small}>{d.creditor}</Text></View><Text style={ui.amount}>{money(d.cents)}</Text></View><Text style={ui.small}>Cargo mensual previsto: {money(d.monthlyCents)}</Text><Button label={d.cents ? 'Registrar abono' : 'Deuda saldada'} secondary disabled={!d.cents} onPress={() => onDebt(d.id)} /></Card>)}
      <Notice>Los cargos mensuales se muestran como ejemplo; aún no se acumulan automáticamente. Los abonos sí actualizan el saldo durante esta sesión.</Notice>
    </>}
  </View>;
}
