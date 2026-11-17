export type StorageErrorCode = 'missing-key' | 'encryption-unavailable' | 'invalid-key' | 'corrupt-data' | 'future-schema' | 'unsupported' | 'unavailable' | 'already-initialized';
const messages: Record<StorageErrorCode, string> = {
  'missing-key': 'Hay datos en este dispositivo, pero no se encontró su clave. No se borraron ni se reemplazaron. No desinstales la app; necesitarás la clave original o un respaldo recuperable.',
  'encryption-unavailable': 'Esta compilación no incluye el cifrado necesario. Usa una compilación nativa de Saldo en Mano con SQLCipher; Expo Go solo permite la demostración.',
  'invalid-key': 'No se pudo utilizar la clave de este dispositivo. No se borraron los datos.',
  'corrupt-data': 'No se pudo abrir o validar la información guardada. Se conservaron los archivos sin reemplazarlos.',
  'future-schema': 'Estos datos pertenecen a una versión más reciente. Actualiza la app para abrirlos; no se modificó la información.',
  unsupported: 'Esta plataforma permite la demostración; el guardado cifrado se prepara para Android e iPhone.',
  unavailable: 'No se pudo acceder al almacenamiento seguro. Intenta nuevamente; no desinstales la aplicación.',
  'already-initialized': 'Ya existe una configuración. Se conservó la información guardada.',
};
export class StorageError extends Error {
  readonly code: StorageErrorCode;
  constructor(code: StorageErrorCode) { super(messages[code]); this.name = 'StorageError'; this.code = code; }
}
export function storageMessage(error: unknown): string {
  return error instanceof StorageError ? error.message : messages.unavailable;
}
