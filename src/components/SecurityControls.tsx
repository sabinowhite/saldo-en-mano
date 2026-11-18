import { useEffect, useState } from 'react';
import { Platform, Switch, Text, TextInput, View } from 'react-native';
import type { FinanceState } from '../domain/finance';
import { backupStatus, enableBackups, exportBackup, recoveryKey } from '../services/backup';
import { remindersEnabled, setRemindersEnabled, syncReminders } from '../services/reminders';
import { lockEnabled, setLockEnabled } from '../services/privacy';
import { Button, Card, Heading, Notice, colors, ui } from './ui';
import { DriveControls } from './DriveControls';
import { RestoreBackup } from './RestoreBackup';
export function SecurityControls({ state, onRestore }: { state: FinanceState; onRestore: (state: FinanceState) => Promise<void> }) {
  const [lock, setLock] = useState(false); const [status, setStatus] = useState<{ enabled: boolean; last: string | null }>({ enabled: false, last: null });
  const [reminders, setReminders] = useState(false);
  const [key, setKey] = useState(''); const [verify, setVerify] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [restoring, setRestoring] = useState(false);
  useEffect(() => { void Promise.all([lockEnabled(), backupStatus(), remindersEnabled()]).then(([l, b, r]) => { setLock(l); setStatus(b); setReminders(r); }).catch(() => setError('No se pudo consultar la protección o el respaldo.')); }, []);
  async function task(fn: () => Promise<void>) {
    if (busy) return; setBusy(true); setError(''); setMessage('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); } finally { setBusy(false); }
  }
  return <><Card><Heading title="Recordatorios" /><Text style={ui.small}>Avisos de pagos, ingresos y revisión de quincena. No muestran montos ni nombres de acreedores en la notificación.</Text><View style={ui.spread}><Text style={ui.body}>Recordatorios del teléfono</Text><Switch accessibilityLabel="Recordatorios del teléfono" value={reminders} disabled={busy || Platform.OS === 'web'} onValueChange={enabled => { void task(async () => { await setRemindersEnabled(enabled); setReminders(enabled); await syncReminders(state); setMessage(enabled ? 'Recordatorios programados. Su entrega depende de los ajustes del teléfono.' : 'Recordatorios desactivados.'); }); }} trackColor={{ true: colors.primary }} /></View></Card><Card><Heading title="Protege el acceso" /><Text style={ui.small}>Usa la biometría o el código del teléfono al abrir y volver a la app. No se crea una contraseña de usuario.</Text><View style={ui.spread}><Text style={ui.body}>Bloqueo de la aplicación</Text><Switch accessibilityLabel="Bloqueo de la aplicación" value={lock} disabled={busy || Platform.OS === 'web'} onValueChange={enabled => { void task(async () => { await setLockEnabled(enabled); setLock(enabled); }); }} trackColor={{ true: colors.primary }} /></View></Card>
    <Card><Heading title="Respaldos recuperables" /><Text style={ui.small}>{status.enabled ? 'Copias locales automáticas activadas. Se conservan hasta 10 versiones cifradas.' : 'Activa las copias automáticas después de guardar tu clave de recuperación.'}</Text><Text style={ui.small}>Última copia local: {status.last ? new Date(status.last).toLocaleString('es-MX') : 'Sin copia confirmada'}</Text><Notice>Una copia dentro del teléfono no protege si se pierde. Exporta un respaldo y guarda su clave por separado, fuera del teléfono.</Notice>
      <Button label="Ver y guardar mi clave de recuperación" secondary disabled={busy} onPress={() => { void task(async () => { setKey(await recoveryKey()); setVerify(''); }); }} />
      {!!key && <><Text selectable style={[ui.body, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 26 }]}>{key.match(/.{1,4}/g)?.join(' ')}</Text><Text style={ui.small}>Guarda esta clave en un lugar seguro. Sin ella no podrás abrir los respaldos después de perder el teléfono. Para confirmar que la guardaste, escribe sus últimos 8 caracteres.</Text><TextInput accessibilityLabel="Últimos ocho caracteres de la clave" style={ui.input} value={verify} onChangeText={setVerify} autoCorrect={false} autoCapitalize="none" maxLength={8} /><Button label="Activar copias automáticas locales" disabled={busy || verify.toLowerCase() !== key.slice(-8)} onPress={() => { void task(async () => { await enableBackups(); const { automaticBackup } = await import('../services/backup'); await automaticBackup(state); setStatus(await backupStatus()); setKey(''); setMessage('Copia local cifrada creada. Exporta una copia fuera del teléfono.'); }); }} /></>}
      <Button label="Exportar respaldo cifrado" disabled={busy || !status.enabled} onPress={() => { void task(async () => { await exportBackup(state); setMessage('Se abrió el selector para guardar o compartir. Confirma allí el destino; la app no puede verificar una copia externa.'); }); }} />
      <Button label="Restaurar desde archivo" secondary disabled={busy} onPress={() => setRestoring(true)} />
      
    </Card>
    <DriveControls backupsReady={status.enabled} />
    {!!message && <Text style={[ui.small, { color: colors.primary }]}>{message}</Text>}{!!error && <Text style={{ color: colors.red }}>{error}</Text>}
    {restoring && <RestoreBackup onClose={() => setRestoring(false)} onRestore={onRestore} />}
  </>;
}
