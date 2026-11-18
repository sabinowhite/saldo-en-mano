import { DateField } from '../components/DateField';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Frequency, localDate, money, parseMoney } from '../domain/finance';
import { InitialSetup, createInitialState } from '../domain/setup';
import { nextScheduled } from '../domain/schedule';
import { Button, Card, Chip, Heading, Notice, colors, ui } from '../components/ui';
export function Onboarding({ onFinish, onBack }: { onFinish: (input: InitialSetup) => Promise<void>; onBack: () => void }) {
  const [bank, setBank] = useState('');
  const [cash, setCash] = useState('');
  const [salary, setSalary] = useState('');
  const [offering, setOffering] = useState('5');
  const [frequency, setFrequency] = useState<Frequency>('fortnightly');
  const [incomeDate, setIncomeDate] = useState(nextScheduled(localDate(), 'fortnightly') ?? localDate());
  const [date, setDate] = useState(localDate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState<InitialSetup | null>(null);
  function prepare() {
    setError('');
    const bankCents = /^0(?:[.,]0{1,2})?$/.test(bank.trim()) ? 0 : parseMoney(bank);
    const cashCents = /^0(?:[.,]0{1,2})?$/.test(cash.trim()) ? 0 : parseMoney(cash);
    const salaryCents = parseMoney(salary);
    const percent = /^\d{1,3}(?:[.,]\d{1,2})?$/.test(offering) ? Number(offering.replace(',', '.')) : NaN;
    if (bankCents === null || cashCents === null || salaryCents === null) return setError('Captura ambos saldos (pueden ser 0) y un ingreso mayor que cero, sin separadores de miles.');
    const input = { bankCents, cashCents, date, settings: { salaryCents, frequency, offeringPercent: percent, nextIncomeDate: incomeDate, incomeAnchorDay: Number(incomeDate.slice(8)) } };
    try { createInitialState(input); setReview(input); } catch (e) { setError(e instanceof Error ? e.message : 'Revisa la configuración.'); }
  }
  async function finish() {
    if (!review || busy) return;
    setBusy(true); setError('');
    try { await onFinish(review); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
    <Heading title={review ? 'Confirma tu punto de partida' : 'Empecemos con lo que tienes'} subtitle="Configuración inicial · Sin registro de usuario" />
    {review ? <><Card><View style={ui.spread}><Text style={ui.body}>Banco</Text><Text style={ui.amount}>{money(review.bankCents)}</Text></View><View style={ui.spread}><Text style={ui.body}>Efectivo</Text><Text style={ui.amount}>{money(review.cashCents)}</Text></View><Text style={ui.small}>Saldos al inicio del {review.date.split('-').reverse().join('/')}. Los movimientos que registres desde ese día se sumarán o descontarán de estas cantidades.</Text><Text style={ui.small}>Ingreso esperado: {money(review.settings.salaryCents)}. No se abonará automáticamente al banco.</Text></Card><Notice>No vuelvas a registrar los ingresos, gastos o retiros que ya estén incluidos en estos saldos. Para reconstruir una quincena, usa los saldos que tenías al comenzar y después registra sus movimientos.</Notice><Button label={busy ? 'Guardando configuración…' : 'Confirmar y guardar'} disabled={busy} onPress={finish} /><Button label="Corregir datos" secondary disabled={busy} onPress={() => setReview(null)} /></> : <>
      <Notice>Elige un punto de partida: usa tus saldos de hoy para comenzar ahora, o los del inicio de la quincena para capturar lo ocurrido desde entonces. No se crearán ingresos ni gastos ficticios.</Notice>
      <Card><Text style={ui.h3}>Fecha de esos saldos</Text><DateField label="Fecha de los saldos iniciales" value={date} onChange={setDate} maximumDate={localDate()} /><Text style={ui.h3}>Dinero en banco</Text><TextInput accessibilityLabel="Saldo inicial en banco" style={ui.input} keyboardType="decimal-pad" placeholder="0.00" value={bank} onChangeText={setBank} maxLength={12} /><Text style={ui.h3}>Efectivo en tu cartera</Text><TextInput accessibilityLabel="Saldo inicial en efectivo" style={ui.input} keyboardType="decimal-pad" placeholder="0.00" value={cash} onChangeText={setCash} maxLength={12} /></Card>
      <Card><Text style={ui.h3}>Ingreso habitual en pesos</Text><TextInput accessibilityLabel="Ingreso habitual inicial" style={ui.input} keyboardType="decimal-pad" placeholder="Monto que esperas recibir" value={salary} onChangeText={setSalary} maxLength={12} /><Text style={ui.small}>Solo aumenta tu saldo cuando confirmes que lo recibiste.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{([{ key: 'weekly', label: 'Semanal' }, { key: 'fortnightly', label: 'Quincenal' }, { key: 'monthly', label: 'Mensual' }] as const).map(f => <Chip key={f.key} selected={frequency === f.key} label={f.label} onPress={() => setFrequency(f.key)} />)}</View><Text style={ui.h3}>Próxima fecha de ingreso</Text><DateField label="Primera fecha de ingreso esperado" value={incomeDate} onChange={setIncomeDate} /><Text style={ui.h3}>Ofrenda: porcentaje del ingreso</Text><TextInput accessibilityLabel="Porcentaje inicial de ofrenda" style={ui.input} keyboardType="decimal-pad" value={offering} onChangeText={setOffering} maxLength={6} /><Text style={ui.small}>Editable después. El diezmo se calcula al 10 %. Esta configuración no crea apartados.</Text></Card>
      <Button label="Revisar configuración" onPress={prepare} /><Button label="Volver" secondary onPress={onBack} />
    </>}
    {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.red }}>{error}</Text>}
  </ScrollView></SafeAreaView>;
}
