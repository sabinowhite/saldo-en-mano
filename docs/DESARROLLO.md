# Desarrollo — prototipo 0.1.0

## Preparación

Usar Node.js 24 y npm. Desde la raíz del repositorio:

```sh
npm ci
npm run web
```

La vista web sirve para revisar diseño y flujos. Para probar en dispositivos:

```sh
npm start
npm run android
npm run ios
```

Se requiere un dispositivo o emulador compatible con SDK 58. Expo Go debe soportar este SDK; si no lo soporta, usar una development build. El comando iOS con simulador requiere macOS y Xcode. La revisión web no sustituye las pruebas en Android e iPhone.

## Lo que ya se puede probar

- Navegar por inicio, movimientos, plan financiero y ajustes mediante Expo Router.
- Ver banco, cartera, compromisos y disponible por separado.
- Simular ingresos recibidos, gastos y transferencias entre banco y efectivo.
- Revisar concepto, fecha, monto y origen antes de confirmar.
- Advertir cuando una salida afecta dinero reservado o excede el saldo; el usuario puede continuar.
- Mostrar insuficiencia después de continuar; no ocultarla con un saldo cero artificial.
- Registrar entrega completa de apartados y pago completo de pendientes de ejemplo.
- Registrar abonos parciales a deudas sin superar el saldo pendiente.
- Filtrar movimientos por tipo y alternar quincena actual / historial completo.
- Cambiar monto y frecuencia del ingreso esperado y porcentaje de ofrenda; ver la estimación sin modificar movimientos anteriores.
- Reiniciar los datos ficticios con confirmación.

Todos los cambios existen únicamente en memoria y se descartan al recargar o cerrar el proceso. Los ejemplos se generan con la fecha local de apertura. No hay acceso a cuentas bancarias, registro de usuarios ni tráfico de datos financieros hacia servidores de la app.

## Todavía pendiente

- Configuración inicial de saldos; la app abre directamente en demostración.
- Persistencia SQLite cifrada y migraciones.
- Alta y edición completa de movimientos, cuentas, apartados, plantillas y deudas.
- Edición de importe y origen al pagar una plantilla; ahora solo se prueban los pendientes fijos de ejemplo.
- Entregas parciales, nuevos conceptos y traslado de reservas entre cuentas.
- Generación de ingresos esperados, vinculación de pagos parciales y fechas configurables de nómina.
- Generación periódica de pagos y cargos de deuda, con manejo de meses sin conexión.
- Historial por año, cierre y reportes completos.
- Notificaciones y recordatorios del sistema.
- Biometría, almacenamiento seguro y bloqueo.
- Copias cifradas en Drive, exportación y recuperación entre Android e iOS.
- Identidad gráfica final, icono propio y aviso de privacidad de publicación.
- Clave permanente de firma, custodia, compilación de distribución y prueba de actualización sin desinstalar.

La opción de seguridad en ajustes es informativa: no es un interruptor que prometa protección inexistente.

## Organización del código

| Ruta | Responsabilidad |
| --- | --- |
| src/app | Rutas y composición mediante Expo Router |
| src/screens | Vistas de inicio, movimientos, planes y ajustes |
| src/components | Componentes visuales y formulario de movimientos |
| src/domain/finance.ts | Tipos, dinero en centavos, fechas y operaciones puras |
| src/state/DemoContext.tsx | Estado temporal de la demostración |
| tests/finance.test.ts | Reglas financieras e invariantes |

Las reglas de dominio están separadas de React para poder reutilizarlas con la futura persistencia. Los pagos y entregas reconocen su estado previo y los identificadores de movimientos, para evitar duplicación dentro de la sesión. La idempotencia durable requiere la futura base transaccional.

## Comprobaciones

```sh
npm run check
npx expo-doctor
npm run export:web
npm run export:native
```

La exportación nativa verifica los bundles JavaScript de Android e iOS; **no genera ni firma un APK, AAB o IPA**, ni demuestra que la interfaz funcione en un teléfono físico. GitHub Actions ejecuta lint, TypeScript, pruebas y exportaciones en cada cambio de código.

## Identidad y distribución

Identificadores reservados en la configuración inicial:

- Android: com.sabinowhite.saldoenmano
- iOS: com.sabinowhite.saldoenmano
- Esquema de enlaces: saldoenmano
- Versión: 0.1.0; códigos iniciales: 1.

No cambiar estos identificadores después de distribuir la primera instalación. Antes de crear el primer APK para el usuario, configurar una clave permanente, respaldarla de forma segura fuera de Git y documentar cómo se utilizará en futuras actualizaciones. No entregar como versión de uso real un APK con firma de depuración.

No se incluye configuración EAS con credenciales temporales ni se realiza ninguna publicación automática. La autenticación y firma de las tiendas requieren preparación posterior.

## Datos de prueba

Los montos y acreedores son ficticios. El prototipo incluye $14,000 de ingreso, $3,000 transferidos a efectivo y $480 de gasolina. El banco queda en $11,000 y el efectivo en $2,520. Con $2,200 de apartados y $2,000 reservados para tarjeta, el disponible inicial es $9,320. Internet aparece como pendiente sin reserva.

## Validación de esta entrega (17 de noviembre de 2026)

- Lint y TypeScript: correctos.
- 13 pruebas de dominio: correctas.
- Expo Doctor: 20 de 20 comprobaciones correctas.
- Exportaciones web, Android e iOS: generadas correctamente. No se ha compilado un binario nativo firmado.
- Revisión visual automatizada: no completada; el navegador local no pudo iniciar por restricciones de sockets del entorno. Tampoco se ha probado en teléfonos físicos. El arranque interactivo de Expo en este entorno encontró la misma restricción de interfaces de red; las exportaciones funcionaron.

### Auditoría de dependencias pendiente

La ejecución de npm audit --omit=dev detectó avisos transitivos, principalmente en herramientas de Expo/Metro y coincidencia de patrones. No afirmar que la auditoría está limpia:

- [picomatch / GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf): ReDoS por patrones extglob controlados por un atacante; sin versión corregida publicada en la consulta realizada. La app no recibe patrones glob desde formularios, pero falta resolver y volver a evaluar las rutas transitivas antes de publicar.
- [minimatch / GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): amplificación de patrones; existe corrección upstream, pero fingerprint aún instala una versión afectada. Actualizar por una vía compatible y repetir las comprobaciones.

No se aplicó npm audit fix --force: la propuesta automática retrocedía de SDK 58 a SDK 52 con cambios incompatibles y no demostraba resolver picomatch. Estos avisos quedan como trabajo previo a distribución, sin ocultarlos mediante exclusiones del informe.
