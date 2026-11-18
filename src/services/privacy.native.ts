import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
const KEY = 'saldo-en-mano.lock-enabled';
const options = { keychainService: 'com.sabinowhite.saldoenmano.security' };
const listeners = new Set<(enabled: boolean) => void>();
export async function lockEnabled(): Promise<boolean> { return (await SecureStore.getItemAsync(KEY, options)) === 'true'; }
export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloquear Saldo en Mano', cancelLabel: 'Cancelar', fallbackLabel: 'Usar código del teléfono', disableDeviceFallback: false, biometricsSecurityLevel: 'strong' });
  return result.success;
}
export async function setLockEnabled(enabled: boolean): Promise<void> {
  if (enabled && await LocalAuthentication.getEnrolledLevelAsync() === LocalAuthentication.SecurityLevel.NONE) throw new Error('Configura primero un código de bloqueo o biometría en tu teléfono.');
  if (!await authenticate()) throw new Error('No se confirmó tu identidad. La configuración no cambió.');
  await SecureStore.setItemAsync(KEY, String(enabled), options);
  listeners.forEach(listener => listener(enabled));
}
export function subscribeLock(listener: (enabled: boolean) => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
