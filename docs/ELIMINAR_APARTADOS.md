# Eliminar apartados — 0.3.6

Mi plan muestra «Eliminar apartado» directamente en cada tarjeta activa y en el editor. La primera opción abre una confirmación con concepto e importe pendiente que se liberará; «Conservar apartado» cierra sin cambios.

Al confirmar, desaparece de la lista activa y queda consultable en «Eliminados». Se libera solo lo pendiente de entregar. Banco y efectivo no aumentan: reservar no es una salida de dinero. Las entregas y sus gastos asociados se conservan y se pueden corregir desde Movimientos.

Reutiliza el estado persistido de cancelación para conservar compatibilidad, sin migración ni cambio de claves. La acción delete-reserve es idempotente y admite apartados entregados. Los eliminados no permiten nuevas entregas.

Validación: lint, TypeScript, configuración nativa y 55 pruebas correctas. Incluye eliminación sin entregas, parcial y total; identidad de saldos; serialización; reintento; y corrección posterior de entregas.

APK de actualización: generado con el bundle Android export:embed y Hermes de las dependencias bloqueadas del proyecto, reutilizando los DEX y bibliotecas nativas de 0.3.5 tras interrumpirse la descarga de dependencias de Gradle. Se verificaron igualdad de dependencias y ABI de Hermes, integridad de DEX y bibliotecas, recursos e imágenes, versión 0.3.6/code 9, alineación de 16 KB, constructor Room y firma permanente v2/v3. No cambia ningún módulo nativo. La ejecución en el teléfono queda pendiente de confirmación del usuario.
