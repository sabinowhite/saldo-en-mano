import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { FinanceState, money } from '../domain/finance';
import type { DriveFile } from '../services/drive-client';
import { cloudStatus, connectDrive, listDriveBackups, downloadDriveBackup } from '../services/drive';
import { openBackupDocument, pickBackup } from '../services/backup';
import { checkRecoveryKey } from '../storage/backup-codec';
import { SheetFrame } from './SheetFrame';
import { Button, Card, Notice, colors, ui } from './ui';
export function RestoreBackup({ onRestore, onClose }: { onRestore: (state: FinanceState) => Promise<void>; onClose: () => void }) {
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [key, setKey] = useState(''); const [candidate, setCandidate] = useState<{ state: FinanceState; createdAt: string } | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function choose() {
    setError(''); setBusy(true);
    try { const result = await pickBackup(checkRecoveryKey(key)); if (result) setCandidate(result); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el respaldo.'); } finally { setBusy(false); }
  }
  async function listCloud() {
    setBusy(true); setError('');
    try { checkRecoveryKey(key); const status = await cloudStatus(); if (!status.configured) throw new Error('Esta compilación todavía no tiene habilitado Google Drive.'); if (!status.connected) await connectDrive(); setFiles(await listDriveBackups()); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo consultar Drive.'); } finally { setBusy(false); }
  }
  async function openCloud(id: string) {
    setBusy(true); setError('');
    try { setCandidate(await openBackupDocument(await downloadDriveBackup(id), key)); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el respaldo de Drive.'); } finally { setBusy(false); }
  }
  async function restore() {
    if (!candidate || busy) return; setBusy(true); setError('');
    try { await onRestore(candidate.state); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo restaurar. Se conservaron los datos anteriores.'); } finally { setBusy(false); }
  }
  return <SheetFrame title="Restaurar un respaldo" busy={busy} onClose={onClose}>{candidate ? <><Card><Text style={ui.h3}>Respaldo verificado</Text><Text style={ui.small}>{new Date(candidate.createdAt).toLocaleString('es-MX')}</Text><Text style={ui.body}>Banco: {money(candidate.state.balances.bank)}</Text><Text style={ui.body}>Efectivo: {money(candidate.state.balances.cash)}</Text><Text style={ui.small}>{candidate.state.entries.length} movimientos · {candidate.state.debts.length} deudas</Text></Card><Notice>Esto reemplazará la información activa por la del respaldo. La base cifrada conservará una copia de seguridad del estado anterior antes de aplicar el cambio.</Notice><Button label={busy ? 'Restaurando…' : 'Confirmar restauración'} disabled={busy} onPress={restore} /><Button label="Elegir otro respaldo" secondary disabled={busy} onPress={() => setCandidate(null)} /></> : <><Text style={ui.body}>Escribe la clave de recuperación del respaldo. Puedes seleccionar el archivo desde el teléfono o un proveedor de archivos como Drive.</Text><TextInput accessibilityLabel="Clave de recuperación del respaldo" style={ui.input} value={key} onChangeText={setKey} placeholder="64 caracteres de recuperación" autoCapitalize="none" autoCorrect={false} secureTextEntry maxLength={90} /><Button label={busy ? 'Verificando…' : 'Seleccionar archivo de respaldo'} disabled={busy} onPress={choose} /><Button label="Buscar mis respaldos en Google Drive" secondary disabled={busy} onPress={listCloud} />{files && !files.length && <Text style={ui.small}>No se encontraron respaldos de esta aplicación en la cuenta elegida.</Text>}{files?.slice(0, 20).map(file => <Button key={file.id} label={file.createdTime ? new Date(file.createdTime).toLocaleString('es-MX') : 'Respaldo disponible'} secondary disabled={busy} onPress={() => { void openCloud(file.id); }} />)}</>}{!!error && <Text style={{ color: colors.red }}>{error}</Text>}</SheetFrame>;
}
