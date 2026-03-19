import Constants from 'expo-constants';

function getExpoDevHost() {
  const expoConfig = Constants.expoConfig as { hostUri?: string } | null;
  const hostUri = expoConfig?.hostUri;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0] ?? null;
}

const localDevelopmentBaseUrl = `http://${getExpoDevHost() ?? 'localhost'}:3000`;

// TODO: Replace with environment-specific configuration once deployment targets are introduced.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? localDevelopmentBaseUrl;
