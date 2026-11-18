const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const config = JSON.parse(execFileSync(process.execPath, [require.resolve('expo/bin/cli'), 'config', '--type', 'public', '--json'], { encoding: 'utf8' }));
assert.match(config.extra?.eas?.projectId ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Primero vincula el proyecto a tu cuenta de Expo con EAS y configura EAS_PROJECT_ID.');
assert.match(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '', /^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/, 'Falta el cliente OAuth web para el respaldo automático de Google Drive.');
assert.equal(require('../eas.json').build.preview.credentialsSource, 'remote');
assert.equal(require('../eas.json').build.preview.android.buildType, 'apk');
console.log('Configuración externa presente. EAS todavía debe confirmar la cuenta y las credenciales permanentes de firma.');
