import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DemoProvider } from '../state/DemoContext';
import { Icon, IconName, colors, ui } from '../components/ui';
const tabs: { path: '/' | '/movements' | '/plans' | '/settings'; label: string; icon: IconName; active: IconName }[] = [
  { path: '/', label: 'Inicio', icon: 'grid-outline', active: 'grid' },
  { path: '/movements', label: 'Movimientos', icon: 'swap-vertical-outline', active: 'swap-vertical' },
  { path: '/plans', label: 'Mi plan', icon: 'layers-outline', active: 'layers' },
  { path: '/settings', label: 'Ajustes', icon: 'options-outline', active: 'options' },
];
function Shell() {
  const path = usePathname();
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <View style={s.shell}>
      <View style={s.header}><View style={s.brandMark}><Icon name="wallet" color="white" size={22} /></View><View style={ui.flex}><Text style={s.brand}>Saldo en Mano</Text><Text style={s.tagline}>Controla cada peso</Text></View><View style={s.demoTag}><Text style={s.demoText}>DEMO</Text></View></View>
      <View style={s.banner}><Icon name="flask-outline" size={15} color={colors.warning} /><Text style={s.bannerText}>Datos de ejemplo · Los cambios no se guardan al cerrar</Text></View>
      <ScrollView key={path} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Slot /></ScrollView>
      <View style={s.nav}>{tabs.map(t => <Pressable key={t.path} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: t.path === path }} onPress={() => router.navigate(t.path)} style={({ pressed }) => [s.navItem, { opacity: pressed ? .6 : 1 }]}><View style={[s.navIcon, path === t.path && { backgroundColor: colors.pale }]}><Icon name={path === t.path ? t.active : t.icon} color={path === t.path ? colors.primary : colors.muted} size={22} /></View><Text style={[s.navLabel, path === t.path && { color: colors.primary, fontWeight: '700' }]}>{t.label}</Text></Pressable>)}</View>
    </View>
  </SafeAreaView>;
}
export default function Layout() { return <SafeAreaProvider><DemoProvider><Shell /></DemoProvider></SafeAreaProvider>; }
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#E8EFEB' : colors.bg },
  shell: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 22, paddingVertical: 16, backgroundColor: 'white' },
  brandMark: { backgroundColor: colors.primary, borderRadius: 13, height: 40, width: 40, alignItems: 'center', justifyContent: 'center' }, brand: { fontSize: 18, fontWeight: '700', color: colors.ink, letterSpacing: -.4 }, tagline: { fontSize: 11, color: colors.muted, marginTop: 2 },
  demoTag: { backgroundColor: colors.pale, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }, demoText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.primary },
  banner: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: colors.warningBg, paddingHorizontal: 20, paddingVertical: 10 }, bannerText: { flex: 1, fontSize: 11, lineHeight: 16, color: colors.warning },
  content: { padding: 22, paddingBottom: 30, gap: 20 },
  nav: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, paddingBottom: 8, paddingHorizontal: 8 }, navItem: { flex: 1, alignItems: 'center', gap: 3, minHeight: 60, justifyContent: 'center' }, navIcon: { paddingVertical: 5, paddingHorizontal: 17, borderRadius: 12 }, navLabel: { fontSize: 10, color: colors.muted },
});
