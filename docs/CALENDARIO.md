# Calendario — 0.3.5

Los campos de fecha usan un selector de calendario: configuración inicial, movimientos nuevos y editados, apertura, ingresos esperados, ingreso habitual, apartados, pagos, programaciones y cargos mensuales de deudas.

Android abre el calendario del sistema con Elegir y Cancelar; cancelar conserva el valor. iOS muestra el calendario con confirmación. La web usa el calendario del navegador. No se obliga a escribir AAAA-MM-DD. Los datos se conservan internamente con ese formato, sin migraciones.

La fecha se construye y convierte en hora local para evitar desplazar un día en México. Se mantienen las validaciones de fechas, la advertencia no bloqueante para movimientos históricos y la identidad contable. Solo la apertura limita la selección a fechas no futuras.

Validación: lint, TypeScript, 53 pruebas, configuración SQLCipher y compilación Android (pendiente de terminar). Las pruebas de interacción en un teléfono deben realizarse tras instalar.
