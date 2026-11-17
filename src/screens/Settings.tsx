import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { FinanceState, Settings as SettingsType, contributions, money, parseMoney } from '../domain/finance';
import { Button, Card, Chip, Heading, Icon, Notice, colors, ui } from '../components/ui';
export function Settings({ state, onSave, onReset }: { state: FinanceState; onSave: (s: SettingsType) => void; onReset: () => void }) {
  const [salary, setSalary] = useState(String(state.settings.salaryCents / 100));
  const [offering, setOffering] = useState(String(state.settings.offeringPercent));
  const [frequency, setFrequency] = useState(state.settings.frequency);
  const [feedback, setFeedback] = useState('');
  const salaryCents = parseMoney(salary);
  const percent = /^\d{1,3}(?:[.,]\d{1,2})?$/.test(offering) ? Number(offering.replace(',', '.')) : NaN;
  const valid = salaryCents !== null && Number.isFinite(percent) && percent >= 0 && percent <= 100;
  const preview = contributions(salaryCents ?? 0, valid ? percent : 0);
  function save() {
    if (!valid || salaryCents === null) return;
    onSave({ salaryCents, frequency, offeringPercent: percent });
    setFeedback('Configuración aplicada a la simulación. Los movimientos y apartados anteriores se mantienen.');
  }
  return <View style={{ gap: 20 }}><Heading title="A tu medida" subtitle="Tú decides cómo organizarte." />
    <Card><View style={ui.row}><Icon name="cash-outline" /><Text style={ui.h2}>Tu ingreso habitual</Text></View><Text style={ui.small}>Configúralo una vez. Solo el ingreso confirmado aumenta el saldo.</Text><Text style={ui.h3}>Monto en pesos</Text><TextInput accessibilityLabel="Monto del ingreso habitual" style={ui.input} keyboardType="decimal-pad" value={salary} onChangeText={setSalary} maxLength={12} /><Text style={ui.h3}>Frecuencia</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{([{ key: 'weekly', label: 'Semanal' }, { key: 'fortnightly', label: 'Quincenal' }, { key: 'monthly', label: 'Mensual' }] as const).map(f => <Chip key={f.key} label={f.label} selected={frequency === f.key} onPress={() => setFrequency(f.key)} />)}</View></Card>
    <Card><View style={ui.row}><Icon name="heart-outline" /><Text style={ui.h2}>Tus aportaciones</Text></View><Text style={ui.small}>Diezmo: 10 % del ingreso. La ofrenda también se calcula sobre el ingreso.</Text><Text style={ui.h3}>Porcentaje de ofrenda</Text><TextInput accessibilityLabel="Porcentaje de ofrenda sobre el ingreso" style={ui.input} keyboardType="decimal-pad" value={offering} onChangeText={setOffering} maxLength={6} /><View style={ui.spread}><Text style={ui.body}>Diezmo estimado</Text><Text style={ui.h3}>{money(preview.tithe)}</Text></View><View style={ui.spread}><Text style={ui.body}>Ofrenda estimada</Text><Text style={ui.h3}>{money(preview.offering)}</Text></View><Text style={ui.small}>Esta vista previa no crea apartados ni modifica los ya confirmados.</Text></Card>
    {!valid && <Notice>Escribe un ingreso mayor que cero y una ofrenda entre 0 y 100 %, con hasta dos decimales.</Notice>}
    <Button label="Aplicar a la demostración" onPress={save} disabled={!valid} />
    {!!feedback && <Text accessibilityLiveRegion="polite" style={[ui.small, { color: colors.primary }]}>{feedback}</Text>}
    <Card><View style={ui.row}><Icon name="shield-checkmark-outline" /><Text style={ui.h2}>Seguridad y respaldo</Text></View><Text style={ui.body}>En preparación</Text><Text style={ui.small}>El bloqueo biométrico, la base cifrada y Google Drive todavía no están habilitados. Esta demostración no guarda información al cerrar ni pide acceso a tus cuentas.</Text></Card>
    <Notice>Utiliza únicamente datos ficticios. Los cambios se pierden al recargar o cerrar la aplicación.</Notice>
    <Button label="Reiniciar datos de ejemplo" onPress={onReset} secondary icon="refresh-outline" />
    <Text style={[ui.small, { textAlign: 'center', paddingVertical: 12 }]}>Saldo en Mano · 0.1.0 · Prototipo interactivo</Text>
  </View>;
}
