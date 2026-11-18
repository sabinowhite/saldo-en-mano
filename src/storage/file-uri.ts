import { StorageError } from './errors.ts';

/** SQLite exposes a native Android path; FileSystem's JavaFile requires a file URI. */
export function databaseDirectoryUri(directory: string): string {
  if (directory.startsWith('file:///')) return directory;
  if (!directory.startsWith('/')) throw new StorageError('unavailable');
  return 'file://' + directory.split('/').map(encodeURIComponent).join('/');
}
