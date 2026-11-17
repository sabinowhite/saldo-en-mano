import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const projectId = process.env.EAS_PROJECT_ID;
  const plugins = (config.plugins ?? []).filter(p => (Array.isArray(p) ? p[0] : p) !== 'react-native-nitro-google-signin');
  if (iosId) plugins.push(['react-native-nitro-google-signin', { iosUrlScheme: iosId.split('.').reverse().join('.') }]);
  return { ...config, name: config.name ?? 'Saldo en Mano', slug: config.slug ?? 'saldo-en-mano', plugins, extra: { ...config.extra, ...(projectId ? { eas: { projectId } } : {}) } };
};
