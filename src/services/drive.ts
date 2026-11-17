import type { DriveFile } from './drive-client';
export type CloudStatus = { configured: boolean; connected: boolean; last: string | null; pending: boolean };
export async function cloudStatus(): Promise<CloudStatus> { return { configured: false, connected: false, last: null, pending: false }; }
export async function connectDrive(): Promise<void> { throw new Error('Drive requiere la aplicación nativa.'); }
export async function disconnectDrive(): Promise<void> {}
export async function flushDrive(): Promise<void> {}
export async function listDriveBackups(): Promise<DriveFile[]> { return []; }
export async function downloadDriveBackup(_id: string): Promise<string> { throw new Error('Drive requiere la aplicación nativa.'); }
export function watchDrive(): () => void { return () => {}; }
