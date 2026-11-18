import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Icon, Notice, colors, ui } from '../components/ui';
export function Welcome({ loading, error, canStart, onStart, onDemo, onRetry, onRestore }: { loading: boolean; error: string | null; canStart: boolean; onStart: () => void; onDemo: () => void; onRetry: () => void; onRestore?: () => void }) {
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <View style={s.mark}><Icon name="wallet" color="white" size={40} /></View>
    <Text style={ui.label}>CONTROLA CADA PESO</Text><Text style={s.title}>{'Tus finanzas,\ncon claridad.'}</Text>
    <Text style={ui.body}>Bienvenido a Saldo en Mano. Conoce lo que tienes, lo que debes y cuánto puedes gastar.</Text>
    <Card><View style={ui.row}><Icon name="phone-portrait-outline" /><Text style={ui.h3}>Primero en tu teléfono</Text></View><Text style={ui.small}>Sin crear usuario ni conectar tu banco. La versión nativa guarda tus movimientos en una base local cifrada.</Text></Card>
    {loading ? <View style={ui.row}><ActivityIndicator color={colors.primary} /><Text style={ui.small}>Comprobando el almacenamiento seguro…</Text></View> : <>
      {error && <><Notice>{error}</Notice><Button label="Reintentar apertura segura" secondary onPress={onRetry} /></>}
      {canStart && <><Notice>Versión de prueba. El respaldo y el bloqueo de acceso todavía están pendientes. Usa datos ficticios hasta completar las pruebas de recuperación.</Notice><Button label="Configurar mis saldos" onPress={onStart} icon="arrow-forward" /></>}
      {onRestore && <Button label="Restaurar un respaldo existente" secondary onPress={onRestore} />}
      <Button label="Explorar con datos de ejemplo" secondary onPress={onDemo} />
      <Text style={ui.small}>La demostración funciona en memoria: puedes experimentar sin crear ni modificar datos personales guardados.</Text>
    </>}
    <Text style={[ui.small, { marginTop: 12 }]}>0.3.0 · Pruebas de desarrollo</Text>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bg }, content: { padding: 28, paddingTop: 46, gap: 22, maxWidth: 520, width: '100%', alignSelf: 'center', flexGrow: 1, justifyContent: 'center' }, mark: { width: 76, height: 76, backgroundColor: colors.primary, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }, title: { color: colors.ink, fontSize: 38, lineHeight: 44, letterSpacing: -1.4, fontWeight: '700' } });
