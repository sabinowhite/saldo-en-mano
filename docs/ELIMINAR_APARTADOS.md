# Eliminar apartados — 0.3.6

Mi plan muestra «Eliminar apartado» directamente en cada tarjeta activa y en el editor. La primera opción abre una confirmación con concepto e importe pendiente que se liberará; «Conservar apartado» cierra sin cambios.

Al confirmar, desaparece de la lista activa y queda consultable en «Eliminados». Se libera solo lo pendiente de entregar. Banco y efectivo no aumentan: reservar no es una salida de dinero. Las entregas y sus gastos asociados se conservan y se pueden corregir desde Movimientos.

Reutiliza el estado persistido de cancelación para conservar compatibilidad, sin migración ni cambio de claves. La acción delete-reserve es idempotente y admite apartados entregados. Los eliminados no permiten nuevas entregas.

Validación: lint, TypeScript, configuración nativa y 55 pruebas correctas. Incluye eliminación sin entregas, parcial y total; identidad de saldos; serialización; reintento; y corrección posterior de entregas.
