# Edición de datos — 0.3.3

Ajustes permite corregir fecha, banco y efectivo de apertura. Se recalculan ambas cuentas desde la apertura y todos los movimientos guardados, sin crear ingresos o gastos. Se acepta cero y se rechazan fechas futuras o posteriores a movimientos y compromisos existentes.

Ajustes también permite modificar monto y fecha de ingresos esperados pendientes, incluidos los parcialmente recibidos. Conserva su identificador y abonos; el monto previsto no puede quedar por debajo de lo recibido. No cambia la frecuencia de los siguientes ingresos. Los ingresos ya recibidos se corrigen desde Movimientos.

Revisión de edición existente:
- Movimientos: concepto, monto, fecha, tipo y cuenta; correcciones de pagos, abonos y entregas conservan sus enlaces.
- Ajustes: ingreso habitual, frecuencia, próxima fecha y porcentaje de ofrenda.
- Mi plan: concepto, total, cuenta y fecha de apartados; no permite bajar el total de lo ya entregado.
- Pagos pendientes: concepto, monto, cuenta, fecha y reserva.
- Programaciones: concepto, monto, cuenta, frecuencia, fecha, monto variable, activación y recordatorio.
- Deudas: acreedor, concepto, saldo y cargo mensual; los ajustes quedan registrados sin descontar efectivo.
- Pagos realizados: se corrigen mediante su movimiento asociado.

No se modifica el esquema de almacenamiento, paquete, claves ni certificado de firma. Se conservan las correcciones de Room y de URI de archivo de 0.3.1 y 0.3.2.
Validación: lint, TypeScript, 50 pruebas de lógica y configuración nativa. La ejecución en el teléfono debe confirmarse tras instalar el APK.
