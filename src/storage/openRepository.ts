import type { FinanceRepository } from './repository';
import { StorageError } from './errors';
// Web deliberately has no financial persistence, localStorage or insecure fallback.
export async function openRepository(): Promise<FinanceRepository> { throw new StorageError('unsupported'); }
