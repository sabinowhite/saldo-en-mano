import { PropsWithChildren, ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export const colors = { ink: '#30231D', muted: '#7B675B', primary: '#AD451C', pale: '#FFE3C7', paper: '#FFFCF8', bg: '#FFF3E6', border: '#EFD4BC', warning: '#8A5C12', warningBg: '#FFF3DB', red: '#B64236' };
export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, color = colors.primary, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <Ionicons name={name} color={color} size={size} accessible={false} />;
}
export function Card({ children }: PropsWithChildren) { return <View style={ui.card}>{children}</View>; }
export function Heading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <View style={ui.heading}><View style={ui.flex}><Text style={ui.h2}>{title}</Text>{subtitle && <Text style={ui.small}>{subtitle}</Text>}</View>{action}</View>;
}
export function Button({ label, onPress, icon, secondary, disabled }: { label: string; onPress: () => void; icon?: IconName; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, { opacity: disabled ? .45 : pressed ? .75 : 1 }]}>{icon && <Icon name={icon} color={secondary ? colors.primary : 'white'} size={19} />}<Text style={[ui.buttonText, secondary && { color: colors.primary }]}>{label}</Text></Pressable>;
}
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[ui.chip, selected && ui.chipSelected]}><Text style={[ui.chipText, selected && { color: colors.primary, fontWeight: '700' }]}>{label}</Text></Pressable>;
}
export function Notice({ children }: PropsWithChildren) { return <View style={ui.notice}><Icon name="information-circle-outline" color={colors.warning} size={19} /><Text style={ui.noticeText}>{children}</Text></View>; }
export const ui = StyleSheet.create({
  flex: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  card: { backgroundColor: colors.paper, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  h2: { fontSize: 20, fontWeight: '700', color: colors.ink, letterSpacing: -.4 },
  h3: { fontSize: 16, fontWeight: '600', color: colors.ink }, body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontSize: 13, lineHeight: 19, color: colors.muted }, label: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  amount: { fontSize: 19, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  button: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { backgroundColor: colors.pale }, buttonText: { fontSize: 15, fontWeight: '700', color: 'white' },
  chip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, justifyContent: 'center' }, chipSelected: { backgroundColor: colors.pale }, chipText: { fontSize: 13, color: colors.muted },
  notice: { padding: 14, borderRadius: 14, backgroundColor: colors.warningBg, flexDirection: 'row', alignItems: 'flex-start', gap: 9 }, noticeText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.warning },
  divider: { height: 1, backgroundColor: colors.border }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.bg, padding: 14, fontSize: 16, color: colors.ink },
  iconTile: { height: 44, width: 44, borderRadius: 14, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center' },
});
