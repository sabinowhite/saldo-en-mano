# Primera versión para prueba completa

## Estado

La candidata de desarrollo 0.3.0 reúne los flujos financieros y los adaptadores nativos. No se ha generado aún un APK ni se afirma que los módulos hayan sido probados en teléfonos. Las comprobaciones de JavaScript y del dominio no sustituyen las pruebas nativas.

Se conserva el identificador com.sabinowhite.saldoenmano. La firma permanente no se ha creado en este entorno: el token se ha guardado en GitHub según confirmación del propietario y el código apunta al proyecto EAS 1fcd41f3-475d-4695-aab2-5835ceea0d4a; falta verificar su acceso desde Actions. Los clientes OAuth de Google tampoco están presentes. Estas configuraciones son necesarias para la primera prueba completa con APK y Drive.

## Funciones incluidas en el código

- Configuración inicial sin registro de usuario; banco y efectivo separados.
- Ingresos esperados semanales, quincenales y mensuales; confirmaciones parciales y atrasadas sin adelantar el saldo.
- Creación, edición y eliminación de movimientos, con constancia de correcciones.
- Recalcular banco, efectivo, pago, apartado o deuda al corregir su movimiento relacionado.
- Diezmo y ofrenda calculados manualmente desde el ingreso base; porcentaje de ofrenda editable.
- Apartados libres, edición, cambio de origen, entregas parciales y cancelación del remanente.
- Pagos únicos, plantillas recurrentes, importes variables, reserva opcional y confirmación del monto y origen reales.
- Deudas con acreedor, saldo ajustable, cargo mensual, abonos y estado de cuenta.
- Recuperación de cargos y pendientes después de meses sin abrir la app, sin duplicarlos.
- Resúmenes quincenales, mensuales y anuales, desglose de gastos e historial de correcciones.
- SQLite/SQLCipher, transacciones y validación contable.
- Bloqueo opcional con biometría fuerte o código del teléfono. Los formularios se ocultan al bloquear sin perder su estado.
- Recordatorios locales opcionales, sin cantidades o acreedores en las notificaciones.
- Respaldo AES-256-GCM, clave de recuperación independiente, diez copias locales, exportación y restauración con confirmación.
- Restauración que preserva el estado anterior en una tabla cifrada, dentro de la misma transacción.
- Conexión opcional a Drive mediante Google Credential Manager en Android y Google Sign-In en iOS; alcance drive.appdata.
- Envío del respaldo cifrado cuando vuelve la conexión, reintentos y tarea de fondo sujeta al sistema operativo.
- Consulta y restauración de copias de Drive con la misma clave externa del respaldo.

Drive permanece deshabilitado si faltan los clientes OAuth de esa compilación. No se pide contraseña de Google ni se incluye un client secret de servidor. La librería nativa de Google es react-native-nitro-google-signin, con Credential Manager; no se utiliza el SDK Android antiguo de Google Sign-In.

## Configuración externa pendiente

### 1. Vincular Expo y custodiar la firma

Usar la cuenta que será propietaria de la app:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest credentials --platform android
```

El project ID proporcionado por el propietario está guardado en app.json. EAS_PROJECT_ID permite sobrescribirlo en el entorno de compilación. Preparar credenciales Android permanentes para esta aplicación y respaldar la keystore, alias y contraseñas en un gestor seguro bajo control del propietario. No subir esos archivos ni contraseñas a Git.

Los perfiles de eas.json usan credentialsSource=remote y códigos crecientes. No generar una keystore nueva en cada compilación. La clave de firma de APK es distinta de la clave de la base local y de la clave de recuperación de respaldos.

La distribución inicial será preview con APK release, no developmentClient ni APK de depuración. Para futuras actualizaciones, utilizar el mismo proyecto, paquete, perfil de credenciales y certificado. Si se incorpora Play App Signing, verificar aparte la compatibilidad del canal de distribución; no asumir que el APK externo y el de Play tendrán la misma firma.

### 2. Preparar Google Cloud

En el proyecto Google Cloud del propietario:

- Habilitar Drive API y configurar el consentimiento OAuth con alcance https://www.googleapis.com/auth/drive.appdata.
- Crear el cliente Android con paquete com.sabinowhite.saldoenmano y la huella SHA-1 del certificado permanente.
- Crear el cliente web usado por Credential Manager y guardar su ID público en EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.
- Para iPhone, crear el cliente iOS con el mismo bundle ID y guardar EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.
- Configurar usuarios de prueba/estado de publicación de OAuth de acuerdo con el entorno. No prometer autorización pública antes de completar los requisitos de Google.

app.config.ts agrega el esquema iOS invertido solamente cuando está configurado el cliente. .env.example enumera los identificadores públicos. No guardar secretos OAuth de servidor: esta app autoriza APIs desde el teléfono.

### 3. Compilar

```sh
npm ci
npm run check
npm run check:build-ready
npx eas-cli@latest build --platform android --profile preview
```

check:build-ready falla intencionalmente mientras no haya project ID y cliente OAuth web; impide confundir una compilación incompleta con la primera prueba completa.

El workflow manual Android preview permite usar GitHub Actions después de crear las credenciales. Configurar EXPO_TOKEN como secret de GitHub y los IDs públicos como variables del repositorio. No solicita, muestra ni guarda tokens en el código. La tarea normal de validación no inicia compilaciones de pago ni publica aplicaciones.

## Límites operativos que deben probarse en la primera instalación

- Los jobs de fondo y las notificaciones dependen de permisos, batería y restricciones del teléfono; no se ejecutan a una hora exacta garantizada.
- Se programan hasta 50 avisos próximos, con horizonte de 90 días; al usar la app se renuevan.
- El cargo mensual se recupera lógicamente al abrir o volver a la app. No se realizan pagos bancarios automáticos.
- El respaldo local no protege por sí solo frente a pérdida del teléfono. Guardar la clave fuera de él y confirmar una copia externa en Drive o por exportación.
- Cada instalación genera su propia clave de respaldo. Al restaurar en otro teléfono, guardar la clave de los nuevos respaldos de ese teléfono; no se incluye la clave dentro del archivo exportado.
- Drive conserva las diez copias más recientes de la aplicación en la cuenta seleccionada. No es sincronización simultánea entre varios teléfonos.
- La entrega de un pago se confirma manualmente. Cancelar un pendiente no cancela su plantilla; desactivar la plantilla detiene los siguientes.
- Las correcciones conservan un registro previo. No se considera una certificación contable ni se solicitan credenciales bancarias.

## Prueba conjunta de la versión completa

Usar primero datos ficticios: configuración inicial, gasto, retiro, ingreso parcial, diezmo/ofrenda, entrega parcial, pago variable, deuda mensual, edición de movimientos y cierre/reapertura. Después comprobar bloqueo, permisos, respaldo, recuperación con clave y una actualización encima de la instalación anterior usando el mismo certificado.

Falta ejecutar estas pruebas nativas y resolver o evaluar formalmente los avisos de dependencias antes de publicar. Los reportes de pruebas unitarias no se presentan como aprobación de seguridad ni de compatibilidad en dispositivos.
