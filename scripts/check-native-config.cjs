const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const expoCli = require.resolve('expo/bin/cli');
const config = JSON.parse(execFileSync(process.execPath, [expoCli, 'config', '--type', 'introspect', '--json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env: { ...process.env, EXPO_OFFLINE: '1' } }));
const mods = config._internal.modResults;
assert.equal(mods.ios.podfileProperties['expo.sqlite.useSQLCipher'], 'true');
assert.ok(mods.android.gradleProperties.some(item => item.key === 'expo.sqlite.useSQLCipher' && item.value === 'true'));
assert.equal(mods.android.manifest.manifest.application[0].$['android:allowBackup'], 'false');
assert.equal(mods.ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads, false);
for (const permission of config.android.blockedPermissions) {
  const item = mods.android.manifest.manifest['uses-permission'].find(p => p.$['android:name'] === permission);
  // Manifest merger uses tools:node="remove" for dependencies that add it back.
  assert.ok(!item || item.$['tools:node'] === 'remove', `Permission unexpectedly granted: ${permission}`);
}
assert.equal(config.android.package, 'com.sabinowhite.saldoenmano');
assert.equal(config.ios.bundleIdentifier, 'com.sabinowhite.saldoenmano');
assert.equal(config.version, require(path.join(process.cwd(), 'package.json')).version);
console.log('Configuración nativa: SQLCipher en ambas plataformas, backup Android deshabilitado, permisos e identidad verificados.');
