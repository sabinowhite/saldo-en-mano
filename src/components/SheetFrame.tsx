import { PropsWithChildren, useContext } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrivacyVisibility } from './PrivacyVisibility';
import { colors, Heading, Icon } from './ui';
export function SheetFrame({ title, children, busy = false, onClose }: PropsWithChildren<{ title: string; busy?: boolean; onClose: () => void }>) {
  const visible = useContext(PrivacyVisibility);
  const inset = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#30231D66', justifyContent: 'flex-end' }}><View style={{ maxHeight: '94%', width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: Math.max(24, inset.bottom + 12), gap: 16 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Heading title={title} /></View><Pressable accessibilityRole="button" accessibilityLabel="Cerrar formulario" disabled={busy} onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" /></Pressable></View>{children}</ScrollView></View></KeyboardAvoidingView></Modal>;
}
