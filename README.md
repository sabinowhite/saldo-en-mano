# Saldo en Mano

**Controla cada peso.**

Aplicación de control de finanzas personales para Android y iPhone. Ayudará a conocer cuánto dinero hay en banco y efectivo, cuánto está comprometido, en qué se gasta y cuánto se debe.

## Estado del proyecto

Candidata de desarrollo 0.3.0 con Expo SDK 58, Expo Router y TypeScript. Incluye movimientos editables, ingresos esperados, apartados parciales, pagos recurrentes, deudas, reportes, almacenamiento cifrado, bloqueo, recordatorios y respaldo recuperable con conexión opcional a Google Drive.

El código está preparado para la primera prueba completa. Aún no hay APK firmado: falta vincular el proyecto de Expo, preparar la firma permanente y configurar los clientes OAuth de Google. Los módulos nativos deben validarse juntos en teléfonos con datos ficticios. Expo Go y la web ofrecen únicamente demostración en memoria.

Consulta [Primera versión completa y configuración pendiente](docs/PRIMERA_VERSION.md), [Desarrollo](docs/DESARROLLO.md) y [Persistencia local](docs/ALMACENAMIENTO.md).

Nombre y lema elegidos para el proyecto; su revisión de marca sigue pendiente antes de publicarlos.

## Principios

- Funcionar sin internet, guardando primero los movimientos en el teléfono.
- Empezar sin crear una cuenta de usuario.
- Capturar movimientos manualmente, sin pedir credenciales ni conexión bancaria.
- Mantener saldos continuos e historial; un cambio de periodo no borra datos.
- Configurar importes y comportamientos después de instalar; no incluir información financiera personal real en el repositorio.
- Permitir editar los datos capturados y recalcular sus efectos de forma consistente.
- Diferenciar dinero existente, dinero apartado y dinero disponible.

## Funciones acordadas

### Configuración inicial e ingresos

El usuario configura monto, frecuencia semanal, quincenal o mensual, fechas y destino del ingreso una sola vez. Puede editar todos esos datos posteriormente.

La configuración genera ingresos esperados, pero no aumenta el saldo hasta confirmar el dinero recibido. Debe permitir pagos parciales y atrasados, vinculados al ingreso esperado para evitar duplicarlo.

Al comenzar se podrán capturar saldos iniciales y movimientos realizados hasta la fecha. Deben existir dos rutas claras: comenzar con los saldos actuales y registrar movimientos desde ese momento, o reconstruir un periodo desde sus saldos de apertura. No sumar otra vez ingresos o retiros ya incluidos en el saldo inicial.

Los cambios de configuración afectarán los siguientes periodos. El historial conservará los montos reales registrados.

### Banco, efectivo y movimientos

- Mostrar saldos de banco y efectivo por separado.
- Registrar ingresos, gastos y transferencias con fecha, concepto, importe y origen o destino correspondiente.
- Los retiros transfieren dinero del banco a la cartera: no son gastos ni ingresos adicionales.
- Un gasto disminuye una sola vez el saldo de su origen.
- Captura rápida de gastos, con fecha del día editable; la hora no es un dato obligatorio.
- Historial con desglose por periodo y acceso a años anteriores.

### Diezmos, ofrendas y otros apartados

La regla final acordada es:

| Concepto | Base |
| --- | --- |
| Diezmo | 10 % del ingreso |
| Ofrenda | Porcentaje configurable del ingreso; inicialmente 5 % |
| Otros conceptos | Nombre e importe capturados por el usuario |

Ejemplo exclusivamente ilustrativo: sobre un ingreso de $14,000, el diezmo es $1,400 y la ofrenda al 5 % es $700. Con un concepto adicional de $100, el total es $2,200. **La ofrenda del 5 % se calcula sobre el ingreso, no sobre el diezmo.**

El usuario confirma manualmente el apartado y puede agregar primicias, fondo de inversión u otros conceptos. Se muestra el desglose y el total.

Apartar dinero reduce el disponible, sin representar todavía una salida de banco o efectivo. El apartado debe indicar dónde está el dinero para calcular también el disponible de cada origen. Un retiro podrá trasladar dinero apartado a efectivo sin crear otro apartado.

Al entregarlo, el usuario confirma fecha, monto y origen: se registra una sola salida y se libera la reserva correspondiente. Debe poder distinguirse lo pendiente de lo entregado.

Si un gasto invade una reserva, mostrar advertencia con el importe afectado y permitir continuar solo con confirmación explícita. No bloquear el movimiento. Si continúa, reflejar la insuficiencia del apartado; nunca presentar como cubierto dinero que ya se gastó.

### Pagos recurrentes configurables

Cada plantilla permite definir:

- Concepto y monto fijo o variable.
- Frecuencia y fecha o ventana de pago.
- Origen predeterminado: banco o efectivo.
- Recordatorio y anticipación.
- Si aparta dinero o únicamente recuerda el compromiso.

Generar el pendiente no equivale a pagarlo. Al confirmar, el usuario puede cambiar monto, fecha y origen. Se registra el gasto sin volver a escribir el concepto y se actualiza el pendiente, evitando duplicaciones si se confirma más de una vez.

El pago de tarjeta se registra como gasto en este alcance, porque no se capturan por separado las compras hechas con ella. Si ese alcance cambia, habrá que revisar esta regla para no duplicar gastos.

### Deudas

El usuario define acreedor, concepto, saldo inicial, fecha y, si corresponde, importe y frecuencia de los incrementos.

- Un cargo periódico aumenta la deuda, sin disminuir banco ni efectivo.
- Cada incremento debe aplicarse una sola vez, incluso al reabrir la app después de varios meses sin conexión.
- Mostrar estado de cuenta con cargos, abonos y saldo.
- Un abono confirmado disminuye la deuda y genera una sola salida de dinero, visible como gasto del periodo según la regla de este alcance.
- Permitir abonos parciales y editar los datos de la deuda.

### Periodos e historial

El corte quincenal es del 1 al 15 y del 16 al último día del mes. Los movimientos se asignan por su fecha y la pantalla muestra claramente el periodo consultado.

El inicio de una nueva quincena cambia la vista al nuevo periodo; no reinicia banco, efectivo, reservas ni deudas. Registrar una fecha de otra quincena requiere indicar el periodo afectado antes de confirmar.

Conservar todo el historial, con filtros por periodo y año. La frecuencia del ingreso es independiente del corte quincenal: tener salario semanal o mensual no cambia silenciosamente la clasificación de movimientos.

## Diseño de las pantallas

Estilo moderno y minimalista, espacios amplios, tipografía legible, pocos colores y acciones claras. Componentes y navegación consistentes en Android e iOS.

Pantallas previstas:

1. Configuración inicial.
2. Inicio: disponible real destacado, periodo, banco, efectivo y apartados.
3. Captura de ingreso, gasto y transferencia.
4. Movimientos e historial.
5. Diezmos, ofrendas y apartados.
6. Pagos pendientes y plantillas.
7. Deudas y estados de cuenta.
8. Resúmenes por periodo.
9. Configuración, bloqueo y respaldos.

Las advertencias deben tener texto además de color. Priorizar accesibilidad, tamaños de texto del sistema y pocos pasos para registrar un gasto.

## Base técnica propuesta

- React Native, Expo y TypeScript para Android e iOS.
- SQLite para persistencia local.
- Separar interfaz, reglas financieras y acceso a datos.
- Seleccionar versiones estables compatibles al iniciar el código y conservar el archivo de dependencias bloqueadas.
- Guardar dinero como unidades menores enteras y definir un redondeo consistente de porcentajes; evitar cálculos monetarios con coma flotante.
- Usar operaciones atómicas y referencias únicas para que un pago, entrega o abono no se contabilice dos veces.

Estas decisiones orientan la implementación. Las bibliotecas concretas y sus versiones aún no están seleccionadas.

## Seguridad y respaldo

Requisitos:

- Uso local sin registro; la autorización de Google será opcional para habilitar respaldos.
- Bloqueo mediante biometría cuando esté disponible y mecanismo de acceso alternativo seguro.
- Cifrado de datos financieros locales y de respaldos; SQLite por sí solo no satisface este requisito.
- Claves y tokens en almacenamiento seguro del sistema, nunca en código, logs ni preferencias sin protección.
- Permisos mínimos, sin solicitar contraseñas de correo o banco.
- Aviso de privacidad que describa el comportamiento real de la versión publicada.

Propuesta de respaldo: copias automáticas cifradas en Google Drive, pendientes cuando no hay conexión, con reintentos, varias versiones y opción manual de exportar y restaurar.

Mostrar último respaldo exitoso, cambios pendientes y fallos. Las restricciones del sistema pueden retrasar tareas en segundo plano: no prometer un respaldo inmediato ni a una hora exacta.

La recuperación debe funcionar aunque se pierda el dispositivo original y permitir pasar de Android a iPhone. Antes de implementarla, definir cómo recuperar la clave de cifrado, validar integridad y formato del respaldo, y proteger los datos existentes antes de restaurar. No depender únicamente de una clave guardada en el teléfono perdido.

Drive se plantea como respaldo de un dispositivo, no como sincronización simultánea entre varios teléfonos en la primera versión.

## Actualizaciones sin desinstalar

Requisito obligatorio desde el primer APK distribuido:

- Identificador de aplicación fijo.
- Misma clave y certificado de firma para todas las actualizaciones Android distribuidas por el mismo canal.
- Código de versión Android creciente y versión visible identificable.
- Clave de firma respaldada de forma segura fuera de Git; no generar una clave temporal en cada compilación.
- Documentar la estrategia de firma y su relación con Play App Signing antes de distribuir por diferentes canales.
- Migraciones versionadas de base de datos, sin borrar los registros del usuario.
- En iOS, mantener identidad de aplicación y gestionar firma y distribución mediante las credenciales correspondientes.

Antes de entregar cada actualización, instalarla sobre la versión anterior y verificar conservación de saldos, movimientos, apartados, deudas y configuración. Un APK de depuración no sustituye la estrategia de firma de distribución.

La identidad definitiva de la app, la custodia de claves y la primera compilación firmada siguen pendientes. No se han creado credenciales de publicación en este cambio.

## Validación prevista

- Aritmética de saldos, retiros, apartados y disponible.
- Porcentajes y redondeo de ofrendas.
- Confirmación repetida de pagos y cargos periódicos sin duplicaciones.
- Edición de movimientos y periodos anteriores.
- Cambio de mes, año y febrero; captura con fechas locales.
- Trabajo sin conexión, recuperación de respaldos y manejo de copias dañadas.
- Migraciones y actualización sobre la versión anterior con datos representativos.
- Pruebas en Android y en iPhone antes de publicar en cada plataforma.

## Próximos pasos

1. Validar pantallas, persistencia y cifrado en compilaciones nativas de prueba.
2. Completar captura y edición de apartados, plantillas, pagos y deudas.
3. Integrar bloqueo, recordatorios y respaldo recuperable.
4. Resolver o evaluar los avisos de dependencias antes de distribuir.
5. Configurar firma permanente y validar la primera distribución Android.
6. Probar y preparar la distribución iOS.

## Datos y secretos fuera de Git

No subir datos reales, bases de datos, respaldos, contraseñas, tokens, archivos de firma ni credenciales de Google o Apple. Usar datos ficticios en ejemplos y pruebas.
