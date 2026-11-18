# Persistencia local — versión 0.3.0

## Estado y límites

Implementación para Android e iOS con SQLite/SQLCipher y clave aleatoria por instalación guardada en SecureStore. Requiere una compilación nativa que incluya SQLCipher; **Expo Go no sirve para probar el guardado cifrado**. La web conserva únicamente la demostración en memoria y no utiliza localStorage.

El código, la configuración nativa y las reglas transaccionales están implementados. Aún falta validar el cifrado y la reapertura con los módulos reales en un dispositivo. Las pruebas automatizadas de repositorio usan SQLite de Node, no simulan ni certifican la criptografía de SQLCipher o el Keystore/Keychain del teléfono. Esta versión sigue siendo de pruebas con datos ficticios.

## Apertura

1. Comprobar disponibilidad del almacén seguro.
2. Abrir una base en memoria y verificar que PRAGMA cipher_version devuelve una versión. No basta con ejecutar PRAGMA key: SQLite normal ignora pragmas desconocidos.
3. Comprobar si existe el archivo privado saldo-en-mano.db.
4. Recuperar la clave del servicio com.sabinowhite.saldoenmano.database.
5. Si hay archivo pero falta la clave, detener la apertura sin crear claves nuevas, borrar archivos o restaurar una demostración sobre ellos.
6. Si es la primera apertura, generar 32 bytes con expo-crypto y guardar la clave antes de crear la base.
7. Abrir la conexión privada con la misma clave, ejecutar quick_check y verificar la versión del esquema.
8. Migrar únicamente versiones conocidas y habilitar WAL, synchronous FULL y protección de memoria de SQLCipher.

La clave se representa como 64 caracteres hexadecimales de una fuente criptográfica. Solo ese formato llega al PRAGMA de clave; no se interpolan datos de formularios. No se registra ni se expone la clave en pantallas o archivos de configuración.

No existe fallback a una base sin cifrar. Una clave inválida, datos inconsistentes o una versión futura muestran un error y conservan los archivos para recuperación.

## Almacén seguro y copias del sistema

La clave usa WHEN_UNLOCKED_THIS_DEVICE_ONLY en iOS y el almacén seguro disponible en Android. El usuario puede activar bloqueo de interfaz mediante biometría o código del teléfono. El cifrado del archivo no equivale a un bloqueo de la interfaz cuando el teléfono está desbloqueado.

Android tiene allowBackup=false y la configuración de exclusión de SecureStore. Se bloquean permisos de almacenamiento externo y superposición de ventanas; iOS no permite cargas de red arbitrarias. No se debe asumir que Android Auto Backup recuperará estos datos. En iOS, una restauración del archivo en otro dispositivo no migra esta clave de dispositivo; por eso la recuperación entre teléfonos depende del respaldo cifrado recuperable independiente, implementado en esta versión.

No eliminar la app para resolver un error: en Android la desinstalación elimina la clave y los datos de la aplicación. No se presenta ninguna opción para borrar datos personales en esta versión. El botón de reinicio existe solo en la demostración y no llama al repositorio persistente.

## Configuración inicial y contabilidad

Se capturan banco, efectivo, ingreso habitual, frecuencia, porcentaje de ofrenda y fecha de apertura. Los saldos pueden ser cero. La fecha no puede estar en el futuro.

Los saldos de apertura no se anotan otra vez como ingreso. El monto de salario es una expectativa, no un abono automático. Para comenzar hoy se usan los saldos actuales; para reconstruir una quincena se usan sus saldos iniciales y se capturan los movimientos posteriores. No se admiten movimientos previos a la apertura.

La información personal comienza sin movimientos, deudas, pagos ni apartados de ejemplo. La demostración se crea por separado y puede abandonarse para volver a cargar los datos personales confirmados.

## Escrituras y migraciones

Esquema 2: tablas finance_state y finance_restore_history; la primera mantiene una sola fila, payload JSON validado y revisión creciente. La implementación inicial guarda el estado completo; una futura normalización de tablas deberá realizarse mediante una migración versionada.

Todas las lecturas y escrituras del repositorio se serializan. Cada cambio usa BEGIN IMMEDIATE, parámetros vinculados y COMMIT o ROLLBACK sobre una única conexión privada ya desbloqueada con la clave. No se usa withExclusiveTransactionAsync porque crea otra conexión que necesitaría su propia inicialización de SQLCipher.

La interfaz publica los nuevos saldos después de completar el guardado. Si falla, mantiene los datos de la última respuesta confirmada y permite reintentar. Los identificadores de movimientos son UUID y se conservan al reintentar una confirmación. Reabrir el repositorio y repetir el mismo identificador no duplica la salida.

La validación comprueba tipos, importes enteros, fechas, identificadores únicos y la identidad contable: saldos de apertura más ingresos menos gastos y transferencias deben coincidir con banco y efectivo. Un payload inválido no se reemplaza por información vacía.

PRAGMA user_version controla el esquema. Una versión mayor que la conocida se rechaza sin hacer migraciones destructivas. La creación del esquema y el cambio de versión son una transacción.

## Pruebas antes de entregar un APK

Pendientes de ejecutar sobre una compilación nativa con datos ficticios:

- Comprobar que cipher_version devuelve una versión y que el archivo no se abre como SQLite plano.
- Crear configuración, registrar un gasto, cerrar forzosamente y reabrir; verificar saldos e historial.
- Registrar retiros, pagos, entregas y abonos; confirmar que el disponible no se descuenta dos veces.
- Probar reinicios, cierre durante una escritura y almacenamiento lleno; conservar el último estado completo.
- Probar clave ausente o inválida en una compilación de pruebas y confirmar que no se borra ni reemplaza la base.
- Comprobar que datos de demostración y personales nunca se mezclan.
- Actualizar sobre una instalación anterior usando el mismo identificador y certificado; verificar conservación de base y clave.
- Revisar bloqueo del dispositivo, navegación, textos grandes y pantallas con teclado en Android e iOS.

Hay recuperación externa cifrada y bloqueo opcional implementados; ya hay un APK release firmado para iniciar la prueba nativa. Ver PRIMERA_VERSION.md para configuración de Drive y límites. Estas comprobaciones no se marcan como aprobadas por haber exportado los bundles JavaScript.

## Referencias

- [SQLite y SQLCipher, Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/)
- [SecureStore, Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)
- [Crypto, Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/)
