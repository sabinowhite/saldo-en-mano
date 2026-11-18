# Corrección del arranque Android 0.3.1

El APK 0.3.0 se cerraba antes de cargar React Native: InitializationProvider iniciaba WorkManager y Room intentaba construir androidx.work.impl.WorkDatabase_Impl por reflexión. La captura del teléfono muestra NoSuchMethodException para el constructor sin parámetros.

La inspección de los DEX del APK original confirma que esa clase existe pero carece de un constructor público sin parámetros con código. Por ello las pruebas de dominio y la verificación de firma no detectaron el cierre.

La configuración de expo-build-properties agrega una regla de R8 que conserva las clases derivadas de androidx.room.RoomDatabase y sus constructores sin parámetros. La regla se genera mediante prebuild; no se edita manualmente el proyecto Android ni se deshabilita WorkManager. Se mantiene la optimización release.

La versión visible aumenta a 0.3.1 y versionCode/buildNumber a 4. Mantener paquete y certificado de 0.3.0 para instalar como actualización, sin borrar datos.

Comprobación del artefacto release:

```sh
python scripts/verify-room-apk.py ruta/al/apk
```

El comando falla sobre el APK 0.3.0 que presenta el defecto. Debe aprobar en el APK corregido antes de entregarlo. Inspecciona los DEX reales, no la fuente ni una compilación debug. La confirmación funcional del arranque en el teléfono sigue siendo una comprobación distinta.
