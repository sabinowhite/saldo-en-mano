import { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Keyboard, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticate, lockEnabled, subscribeLock } from '../services/privacy';
import { PrivacyVisibility } from './PrivacyVisibility';
import { Button, Icon, colors, ui } from './ui';
export function PrivacyGate({ children, mode }: PropsWithChildren<{ mode: 'local' | 'demo' }>) {
  const [loading, setLoading] = useState(mode === 'local'); const [enabled, setEnabled] = useState(false); const [locked, setLocked] = useState(mode === 'local'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const read = useCallback(() => {
    void lockEnabled().then(value => { setEnabled(value); setLocked(value); setLoading(false); setError(''); }).catch(() => { setEnabled(true); setError('No se pudo consultar el bloqueo del dispositivo.'); setLoading(false); setLocked(true); });
  }, []);
  useEffect(() => {
    if (mode === 'local') read();
    return subscribeLock(value => { setEnabled(value); setLocked(false); }); // Change was authenticated by the system.
  }, [mode, read]);
  useEffect(() => { const listener = AppState.addEventListener('change', status => { if (enabled && status !== 'active') { Keyboard.dismiss(); setLocked(true); } }); return () => listener.remove(); }, [enabled]);
  async function unlock() {
    if (busy) return; setBusy(true); setError('');
    try { if (await authenticate()) setLocked(false); else setError('No se confirmó tu identidad. Puedes intentar nuevamente.'); }
    catch { setError('No se pudo abrir la verificación del teléfono.'); } finally { setBusy(false); }
  }
  const visible = mode === 'demo' || (!loading && !locked);
  return <PrivacyVisibility.Provider value={visible}><View style={{ flex: 1 }}><View style={{ flex: 1, opacity: visible ? 1 : 0 }} pointerEvents={visible ? 'auto' : 'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}>{children}</View>{!visible && <SafeAreaView style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}><View style={{ flex: 1, padding: 28, gap: 24, justifyContent: 'center', alignSelf: 'center', maxWidth: 520, width: '100%' }}><Icon name="lock-closed-outline" size={48} /><Text style={ui.h2}>Tu información está protegida</Text>{loading ? <ActivityIndicator color={colors.primary} /> : <><Text style={ui.body}>Confirma tu identidad con la biometría o el código de tu teléfono.</Text><Button label={busy ? 'Verificando…' : 'Desbloquear'} disabled={busy} onPress={unlock} />{!!error && <Text style={{ color: colors.red }}>{error}</Text>}</>}</View></SafeAreaView>}</View></PrivacyVisibility.Provider>;
}
