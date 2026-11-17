import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { cloudStatus, connectDrive, disconnectDrive, flushDrive } from '../services/drive';
import type { CloudStatus } from '../services/drive';
import { Button, Card, Heading, Notice, colors, ui } from './ui';
export function DriveControls({ backupsReady }: { backupsReady: boolean }) {
  const [status, setStatus] = useState<CloudStatus>({ configured: false, connected: false, last: null, pending: false });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let alive = true; const read = () => { void cloudStatus().then(value => { if (alive) setStatus(value); }).catch(() => { if (alive) setError('No se pudo consultar el estado de Drive.'); }); }; read(); const timer = setInterval(read, 5000); return () => { alive = false; clearInterval(timer); }; }, []);
  async function action(kind: 'connect' | 'sync' | 'disconnect') {
    setBusy(true); setError('');
    try { if (kind === 'connect') await connectDrive(); if (kind === 'disconnect') await disconnectDrive(); else await flushDrive(); setStatus(await cloudStatus()); } catch { setError('No se pudo completar la conexión o el respaldo en Drive. Revisa internet y vuelve a autorizar tu cuenta si es necesario. Los datos locales se conservan.'); } finally { setBusy(false); }
  }
  return <Card><Heading title="Google Drive" />{!status.configured ? <Notice>La conexión con Drive todavía no está habilitada en esta compilación. Puedes exportar un respaldo cifrado desde el apartado anterior.</Notice> : <><Text style={ui.body}>{status.connected ? 'Cuenta conectada para respaldos automáticos' : 'Elige una cuenta para guardar copias cifradas'}</Text><Text style={ui.small}>Último respaldo confirmado en Drive: {status.last ? new Date(status.last).toLocaleString('es-MX') : 'Ninguno'}</Text><Text style={ui.small}>{status.pending ? 'Hay cambios pendientes de enviar.' : 'Sin envío pendiente registrado.'}</Text><Text style={ui.small}>Se reintenta al recuperar internet y mediante las tareas que permita el teléfono. No depende de una hora exacta.</Text>{status.connected ? <><Button label={busy ? 'Procesando…' : 'Respaldar ahora en Drive'} disabled={busy} onPress={() => { void action('sync'); }} /><Button label="Desconectar Drive" secondary disabled={busy} onPress={() => { void action('disconnect'); }} /></> : <Button label="Conectar Google Drive" disabled={busy || !backupsReady} onPress={() => { void action('connect'); }} />}{!backupsReady && <Text style={ui.small}>Primero guarda tu clave de recuperación y activa las copias cifradas.</Text>}</>}{!!error && <Text style={{ color: colors.red }}>{error}</Text>}</Card>;
}
