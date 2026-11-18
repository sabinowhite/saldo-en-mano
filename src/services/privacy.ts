export async function lockEnabled(): Promise<boolean> { return false; }
export async function setLockEnabled(_enabled: boolean): Promise<void> { throw new Error('El bloqueo está disponible en Android e iPhone.'); }
export async function authenticate(): Promise<boolean> { return false; }
export function subscribeLock(_listener: (enabled: boolean) => void): () => void { return () => {}; }
