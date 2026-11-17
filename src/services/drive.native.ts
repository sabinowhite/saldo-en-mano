import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import * as BackgroundTask from 'expo-background-task';
import { Directory, File, Paths } from 'expo-file-system';
import { createDriveClient } from './drive-client';
import type { DriveFile } from './drive-client';
import type { CloudStatus } from './drive';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const WEB_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
export const DRIVE_TASK = 'saldo-en-mano.drive-backup';
const PREFIX = 'saldo.drive.';
const configured = () => !isRunningInExpoGo() && !!WEB_ID && (Platform.OS !== 'ios' || !!IOS_ID);
let modulePromise: Promise<typeof import('react-native-nitro-google-signin')> | null = null;
async function google() {
  if (!configured()) throw new Error('Esta compilación todavía no tiene habilitada la conexión con Google Drive.');
  if (!modulePromise) modulePromise = import('react-native-nitro-google-signin').then(module => { module.GoogleOneTapSignIn.configure({ webClientId: WEB_ID!, iosClientId: IOS_ID, scopes: [SCOPE], offlineAccess: false, autoSelectOnSignIn: true }); return module; });
  return modulePromise;
}
async function token(): Promise<string> {
  const { GoogleOneTapSignIn: g, isSuccessResponse } = await google();
  if (Platform.OS === 'ios' && !g.getCurrentUser()) { const restored = await g.signIn(); if (!isSuccessResponse(restored)) throw new Error('Vuelve a conectar tu cuenta de Google.'); }
  const user = g.getCurrentUser(); const account = await SecureStore.getItemAsync(PREFIX + 'account');
  if (!user || user.user.id !== account) throw new Error('Vuelve a conectar la cuenta elegida para tus respaldos.');
  return (await g.getTokens()).accessToken;
}
async function request(url: string, init: RequestInit = {}): Promise<Response> {
  let accessToken = await token();
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    try { response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: 'Bearer ' + accessToken }, signal: controller.signal }); } finally { clearTimeout(timer); }
    if (response.status !== 401 || attempt === 1) return response;
    const { GoogleOneTapSignIn: g } = await google(); await g.clearCachedAccessToken(accessToken); accessToken = await token();
  }
  throw new Error('Google no autorizó el respaldo.');
}
const client = createDriveClient(request);
export async function cloudStatus(): Promise<CloudStatus> { return { configured: configured(), connected: await SecureStore.getItemAsync(PREFIX + 'connected') === 'true', last: await SecureStore.getItemAsync(PREFIX + 'last'), pending: await SecureStore.getItemAsync(PREFIX + 'pending') === 'true' }; }
export async function connectDrive(): Promise<void> {
  const { GoogleOneTapSignIn: g, isSuccessResponse } = await google();
  await g.checkPlayServices(); const result = await g.presentExplicitSignIn();
  if (!isSuccessResponse(result)) throw new Error('La conexión con Google se canceló.');
  if (!result.data.scopes.includes(SCOPE)) { const authorization = await g.requestScopes([SCOPE]); if (!authorization.accessToken) throw new Error('No se autorizó el respaldo de la aplicación en Drive.'); }
  const previousAccount = await SecureStore.getItemAsync(PREFIX + 'account');
  await SecureStore.setItemAsync(PREFIX + 'connected', 'false');
  await SecureStore.setItemAsync(PREFIX + 'account', result.data.user.id);
  if (previousAccount !== result.data.user.id) { await SecureStore.deleteItemAsync(PREFIX + 'uploaded'); await SecureStore.deleteItemAsync(PREFIX + 'last'); }
  await token(); await client.list(); // Confirm scope before marking the connection as usable.
  await SecureStore.setItemAsync(PREFIX + 'connected', 'true');
  if (await BackgroundTask.getStatusAsync() === BackgroundTask.BackgroundTaskStatus.Available) await BackgroundTask.registerTaskAsync(DRIVE_TASK, { minimumInterval: 60 });
}
export async function disconnectDrive(): Promise<void> {
  await SecureStore.setItemAsync(PREFIX + 'connected', 'false');
  await BackgroundTask.unregisterTaskAsync(DRIVE_TASK).catch(() => undefined);
  const { GoogleOneTapSignIn: g } = await google(); await g.signOut();
}
let uploading: Promise<void> | null = null;
export function flushDrive(): Promise<void> {
  if (uploading) return uploading;
  uploading = (async () => {
    if (!configured() || !(await cloudStatus()).connected) return;
    const directory = new Directory(Paths.document, 'encrypted-backups'); if (!directory.exists) return;
    const latest = directory.list().filter((file): file is File => file instanceof File && file.name.endsWith('.smb')).sort((a, b) => b.name.localeCompare(a.name))[0];
    if (!latest || latest.name === await SecureStore.getItemAsync(PREFIX + 'uploaded')) return;
    await SecureStore.setItemAsync(PREFIX + 'pending', 'true');
    const network = await Network.getNetworkStateAsync();
    if (!network.isConnected || network.isInternetReachable === false) return;
    const document = await latest.text();
    await client.upload(latest.name, document);
    await SecureStore.setItemAsync(PREFIX + 'uploaded', latest.name);
    await SecureStore.setItemAsync(PREFIX + 'last', new Date().toISOString());
    await SecureStore.setItemAsync(PREFIX + 'pending', 'false');
    // Keep only this app's encrypted backups, after a successful upload.
    const previous = await client.list();
    for (const file of previous.slice(10)) await client.remove(file.id).catch(() => undefined);
  })().finally(() => { uploading = null; });
  return uploading;
}
export async function listDriveBackups(): Promise<DriveFile[]> { return client.list(); }
export async function downloadDriveBackup(id: string): Promise<string> { return client.download(id); }
export function watchDrive(): () => void {
  const subscription = Network.addNetworkStateListener(state => { if (state.isConnected && state.isInternetReachable !== false) void flushDrive().catch(() => undefined); });
  void flushDrive().catch(() => undefined);
  return () => subscription.remove();
}
