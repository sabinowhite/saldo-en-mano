# Desarrollo — versión 0.3.0

## Ejecutar

Usar Node.js 24 y npm:

```sh
npm ci
npm run web
```

La web permite revisar la demostración interactiva. No guarda información financiera personal. En Android e iOS el uso personal requiere una compilación nativa con SQLCipher: Expo Go muestra un aviso y permite únicamente explorar datos de ejemplo.

La base continúa en Expo SDK 58, Expo Router, React Native y TypeScript, con dependencias bloqueadas. Los plugins se configuran en app.json; no editar proyectos nativos generados manualmente.

## Funciones y entrega

La lista actual de funciones, límites y configuración para el APK está en [Primera versión completa](PRIMERA_VERSION.md). Incluye captura y edición de movimientos, apartados y entregas parciales, pagos recurrentes, ingresos esperados, deuda mensual, reportes, bloqueo, recordatorios y respaldos cifrados recuperables con Drive opcional.

Los datos personales empiezan vacíos. Las expectativas no aumentan el saldo hasta confirmar lo recibido. Las pruebas con el usuario se realizarán en conjunto sobre la primera versión completa para instalar.

## Estructura

| Ruta | Responsabilidad |
| --- | --- |
| src/app | Rutas mediante Expo Router |
| src/screens | Vistas y formularios de bienvenida y configuración |
| src/components | Componentes y revisión de movimientos |
| src/domain | Reglas financieras y configuración inicial |
| src/state/FinanceContext.tsx | Apertura, modo personal/demo y confirmación posterior al guardado |
| src/storage | SQLCipher nativo, claves, validación y repositorio transaccional |
| tests | Pruebas financieras, configuración, claves, migraciones y persistencia |

Ver [Persistencia local](ALMACENAMIENTO.md) para el diseño, los límites y las pruebas pendientes.

## Comprobaciones

```sh
npm run check
npx expo-doctor
npm run export:web -- --output-dir dist/web
npm run export:native -- --output-dir dist/native
```

La exportación verifica JavaScript, no genera ni firma APK/AAB/IPA. La CI comprueba código y bundles. No sustituye probar el motor SQLCipher, Keystore/Keychain, accesibilidad ni interfaz en dispositivos.

Validación local de esta versión: lint y TypeScript correctos, 44 pruebas aprobadas. La comprobación automática de configuración confirma SQLCipher en ambas plataformas, backup Android deshabilitado, permisos restringidos e identidad estable. Las pruebas de repositorio usan SQLite real de Node y comprueban reapertura, escritura fallida, concurrencia, datos corruptos y migraciones. No certifican la implementación criptográfica nativa.

## Distribución e identidad

- Android e iOS: com.sabinowhite.saldoenmano (sin cambios).
- Esquema: saldoenmano.
- Versión: 0.3.0; versionCode y buildNumber: 3.

No hay clave de publicación ni APK de distribución. Antes del primer APK para el usuario debe prepararse y respaldarse una clave permanente fuera de Git. Todos los APK siguientes deben usar la misma identidad y firma, con código de versión creciente. La clave de publicación es distinta de la clave de cifrado generada en cada teléfono.

## Auditoría de dependencias pendiente

La auditoría anterior registró 34 avisos transitivos: 32 altos y 2 moderados, derivados principalmente de las rutas de herramientas afectadas. No afirmar que la auditoría está limpia:

- [picomatch / GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf): ReDoS por patrones extglob controlados por un atacante; sin corrección publicada en la revisión de referencia.
- [minimatch / GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): amplificación de patrones; fingerprint incorporaba una versión afectada.

La app no recibe patrones glob desde los formularios. Deben actualizarse o evaluarse las rutas transitivas y volver a auditar antes de distribuir. No ejecutar npm audit fix --force sin revisar: la propuesta anterior retrocedía de SDK 58 a SDK 52 y no demostraba resolver el aviso de picomatch.

El intento de repetir npm audit para 0.3.0 fue bloqueado por la red (HTTP 403 en registry.npmjs.org). No se dispone de un resultado actualizado; debe repetirse antes de distribuir.
