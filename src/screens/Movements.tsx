import { useState } from 'react';
import { Text, View } from 'react-native';
import { Entry, money, localDate, period, periodLabel } from '../domain/finance';
import { Card, Chip, Heading, Icon, Button, ui, colors } from '../components/ui';
export function MovementList({ entries, onEdit, onDelete }: { entries: Entry[]; onEdit?: (id: string) => void; onDelete?: (id: string) => void }) {
  if (!entries.length) return <Text style={ui.small}>No hay movimientos en este periodo.</Text>;
  return <>{entries.map((e, i) => <View key={e.id} style={{ gap: 16 }}>
    {i > 0 && <View style={ui.divider} />}
    <View style={ui.row}><View style={ui.iconTile}><Icon name={e.kind === 'income' ? 'arrow-down-outline' : e.kind === 'transfer' ? 'swap-horizontal-outline' : 'arrow-up-outline'} color={e.kind === 'expense' ? colors.ink : colors.primary} /></View><View style={ui.flex}><Text style={ui.h3}>{e.concept}</Text><Text style={ui.small}>{e.date.split('-').reverse().join('/')} · {e.account === 'bank' ? 'Banco' : 'Efectivo'}{e.kind === 'transfer' ? ' → ' + (e.account === 'bank' ? 'Efectivo' : 'Banco') : ''}</Text></View><Text style={[ui.h3, { color: e.kind === 'income' ? colors.primary : colors.ink, flexShrink: 1 }]}>{e.kind === 'income' ? '+' : e.kind === 'expense' ? '−' : ''}{money(e.cents)}</Text></View>
    {onEdit && <View style={ui.row}><View style={ui.flex}><Button label="Editar" secondary onPress={() => onEdit(e.id)} /></View>{onDelete && <View style={ui.flex}><Button label="Eliminar" secondary onPress={() => onDelete(e.id)} /></View>}</View>}
  </View>)}</>;
}
export function Movements({ entries, mode, onEdit, onDelete }: { entries: Entry[]; mode: 'demo' | 'local'; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState('Todos');
  const [allPeriods, setAllPeriods] = useState(false);
  const scoped = entries.filter(e => allPeriods || period(e.date) === period(localDate()));
  const shown = scoped.filter(e => filter === 'Todos' || (filter === 'Gastos' ? e.kind === 'expense' : filter === 'Ingresos' ? e.kind === 'income' : e.kind === 'transfer'));
  return <View style={{ gap: 20 }}><Heading title="Tus movimientos" subtitle="Cada entrada y salida, en su lugar." /><View style={ui.row}><Chip label="Quincena actual" selected={!allPeriods} onPress={() => setAllPeriods(false)} /><Chip label="Todo el historial" selected={allPeriods} onPress={() => setAllPeriods(true)} /></View><Text style={ui.small}>{allPeriods ? (mode === 'demo' ? 'Todos los periodos · Datos de ejemplo' : 'Todo tu historial') : periodLabel()}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{['Todos', 'Gastos', 'Ingresos', 'Retiros'].map(f => <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />)}</View><Card><MovementList entries={shown} onEdit={onEdit} onDelete={onDelete} /></Card></View>;
}
