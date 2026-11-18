# Apertura del almacenamiento Android 0.3.2

La app ya carga la bienvenida pero muestra el aviso genérico de almacenamiento. Se encontró un error en la comprobación previa de existencia de la base: SQLite devuelve en Android una ruta nativa sin esquema (/data/.../files/SQLite). FileSystemFile deriva en JavaFile, que utiliza java.io.File(java.net.URI). Ese constructor rechaza el URI relativo, antes de consultar o crear la clave y la base.

Se reprodujo el rechazo `URI is not absolute` mediante la misma API de Java. La corrección convierte únicamente la ruta usada por FileSystem a file:///, conservando exactamente la ubicación nativa. SQLite sigue abriendo la misma base y SecureStore usa el mismo nombre y servicio de clave. No se borran ni se mueven bases, no se regeneran claves existentes y no se permite guardado sin cifrar.

La función de conversión conserva los URI iOS existentes y codifica espacios, acentos y signos de las rutas nativas. Las pruebas incluyen detección de un archivo real y rechazo de rutas ambiguas. Lint, TypeScript, 48 pruebas y configuración nativa correctos.

La corrección anterior de Room/WorkManager permanece en la configuración. Versión visible 0.3.2, versionCode/buildNumber 5, paquete y firma originales. Falta verificar la apertura en el teléfono: la reproducción Java y las pruebas de rutas no sustituyen ejecutar el APK en Android.

La versión incluye referencias de etapa (prueba de cifrado, ruta, clave o apertura) para errores inesperados, sin mostrar mensajes nativos, rutas privadas, claves ni datos financieros.

APK release 0.3.2 generado correctamente, firma original verificada y constructor de WorkDatabase_Impl conservado en los DEX. El bundle incluye las nuevas referencias de apertura. Se distribuye como actualización, sin desinstalar.
