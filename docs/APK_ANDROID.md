# APK Android 0.3.0

Compilación local release completada con Gradle 9.4.1, JDK 21/17, Android SDK 37 y NDK 27.1.12297006. Variante arm64-v8a, paquete com.sabinowhite.saldoenmano, versionCode 3, Android 7.0 o posterior. No requiere Expo Go ni Metro en ejecución.

Metro usa un solo worker para evitar el agotamiento de memoria durante el empaquetado en servidores pequeños. La compilación Gradle local usó dos workers. No se modificaron manualmente los proyectos nativos generados.

El APK final se volvió a firmar con una clave privada exclusiva de la app; apksigner verificó las firmas v2 y v3. El respaldo de la firma se entrega privadamente al propietario y no se incorpora a Git. Usar esa misma clave en todas las siguientes actualizaciones; no generar otra en EAS.

SHA-256 del certificado: f09068d8fc68d048263ebda33842baf5d8d2c31a0e54e1598a968e2883183a74

SHA-1 del certificado para registrar OAuth Android: 69:17:FF:D8:1E:D1:93:4B:39:D8:D8:4C:40:27:6B:34:52:D5:FE:FF

SHA-256 del APK: ef8d47bfdc1d1cadc953629f150cfbc4fe23c0db77554829192790f7e8147c80

Validación: compilación release correcta; 44 pruebas automáticas; lint, TypeScript y configuración nativa. APK con bundle JavaScript, clases Android y biblioteca SQLite. Firma comprobada. No se ha instalado ni ejecutado en un teléfono dentro de este entorno; falta la prueba funcional nativa.

La captura local de finanzas, el bloqueo opcional y los respaldos cifrados por archivo están incluidos. Google Drive queda deshabilitado en esta compilación porque aún no hay clientes OAuth configurados. Los avisos de dependencias pendientes continúan documentados en DESARROLLO.md.
