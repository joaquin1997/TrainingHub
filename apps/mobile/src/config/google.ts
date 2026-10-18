/**
 * Google sign-in client ids (spec 0039), from the build's environment. They
 * are public identifiers, not secrets (constitution Art. 7). Without the id
 * for the platform, Google sign-in is not offered.
 */
export interface GoogleClientIds {
  ios?: string;
  web?: string;
}

const fromEnv: GoogleClientIds = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
};

/** The client id for this platform; Android has none yet (spec TODO). */
export function googleClientIdFor(
  platform: string,
  ids: GoogleClientIds = fromEnv,
): string | undefined {
  if (platform === 'ios') {
    return ids.ios;
  }
  return platform === 'web' ? ids.web : undefined;
}

/**
 * The redirect an iOS client id uses: its reversed form as a URL scheme, which
 * the app registers (app.config.js).
 */
export function googleIosRedirectUri(clientId: string): string {
  const prefix = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
  return `com.googleusercontent.apps.${prefix}:/oauthredirect`;
}
