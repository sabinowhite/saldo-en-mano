import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { FinanceState, localDate, money, period } from '../domain/finance';
import { Card, Chip, Heading, Notice, colors, ui } from '../components/ui';
export function Reports({ state }: { state: FinanceState }) {
  const today = localDate(); const [scope, setScope] = useState('Quincena'); const [year, setYear] = useState(today.slice(0, 4));
  const years = [...new Set([today.slice(0, 4), state.opening.date.slice(0, 4), ...state.entries.map(e => e.date.slice(0, 4))])].sort().reverse();
  const entries = state.entries.filter(e => scope === 'Quincena' ? period(e.date) === period(today) : scope === 'Mes' ? e.date.slice(0, 7) === today.slice(0, 7) : e.date.slice(0, 4) === year);
  const income = entries.filter(e => e.kind === 'income').reduce((s, e) => s + e.cents, 0);
  const expense = entries.filter(e => e.kind === 'expense').reduce((s, e) => s + e.cents, 0);
  const groups = new Map<string, number>();
  entries.filter(e => e.kind === 'expense').forEach(e => groups.set(e.concept, (groups.get(e.concept) ?? 0) + e.cents));
  return <View style={{ gap: 20 }}><Heading title="Tu dinero en perspectiva" subtitle="Ingresos y gastos reales, sin contar retiros dos veces." /><View style={ui.row}>{['Quincena', 'Mes', 'Año'].map(value => <Chip key={value} label={value} selected={scope === value} onPress={() => setScope(value)} />)}</View>{scope === 'Año' && <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={ui.row}>{years.map(y => <Chip key={y} label={y} selected={year === y} onPress={() => setYear(y)} />)}</View></ScrollView>}
    <Card><Text style={ui.small}>Ingresos recibidos</Text><Text style={[ui.amount, { color: colors.primary }]}>{money(income)}</Text><Text style={ui.small}>Gastos realizados</Text><Text style={ui.amount}>{money(expense)}</Text><View style={ui.divider} /><Text style={ui.small}>Diferencia del periodo</Text><Text style={[ui.amount, { fontSize: 30, color: income - expense < 0 ? colors.red : colors.primary }]}>{money(income - expense)}</Text><Text style={ui.small}>Esta diferencia no es tu saldo disponible: el saldo también incluye dinero de periodos anteriores y apartados.</Text></Card>
    <Heading title="¿En qué se fue?" />
    {!groups.size && <Notice>Aún no hay gastos en este periodo.</Notice>}
    {[...groups].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([concept, cents]) => <Card key={concept}><View style={ui.spread}><Text style={[ui.h3, ui.flex]}>{concept}</Text><Text style={ui.h3}>{money(cents)}</Text></View><View style={{ backgroundColor: colors.pale, height: 7, borderRadius: 4 }}><View style={{ width: `${expense ? cents / expense * 100 : 0}%`, height: 7, borderRadius: 4, backgroundColor: colors.primary }} /></View><Text style={ui.small}>{expense ? (cents / expense * 100).toFixed(1) : '0'} % de los gastos del periodo</Text></Card>)}
    <Heading title="Correcciones del historial" subtitle={`${(state.edits ?? []).length} cambios registrados`} />
    {[...(state.edits ?? [])].reverse().slice(0, 10).map(e => <Card key={e.id}><Text style={ui.h3}>{e.after ? 'Movimiento corregido' : 'Movimiento eliminado'}</Text><Text style={ui.small}>{e.date.split('-').reverse().join('/')} · {e.before.concept} · {money(e.before.cents)}{e.after ? ` → ${e.after.concept} · ${money(e.after.cents)}` : ''}</Text></Card>)}
  </View>;
}
