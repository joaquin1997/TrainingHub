import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { googleClientIdFor, googleIosRedirectUri } from '@/config/google';

// Closes the popup when the web build is the redirect target.
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_ISSUER = 'https://accounts.google.com';
const SCOPES = ['openid', 'email', 'profile'];

/** Whether this build can offer Google sign-in (spec 0039 FR-1). */
export function isGoogleSignInAvailable(): boolean {
  return Boolean(googleClientIdFor(Platform.OS));
}

/**
 * Google's sign-in sheet (spec 0039): returns Google's ID token for the
 * server to verify, or null when the person closed the sheet (EF-1). Throws
 * when Google cannot be reached (EF-2).
 *
 * iOS: authorization code with PKCE to the reversed-client-id redirect, then
 * the code exchange (iOS clients are public — no secret in the app). Web: the
 * ID token directly, with a nonce, since Google web clients need a secret to
 * exchange a code.
 */
export async function signInWithGoogleSheet(): Promise<string | null> {
  const clientId = googleClientIdFor(Platform.OS);
  if (!clientId) {
    return null;
  }
  const discovery = await AuthSession.fetchDiscoveryAsync(GOOGLE_ISSUER);

  if (Platform.OS === 'web') {
    const nonce = Crypto.randomUUID();
    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri: AuthSession.makeRedirectUri(),
      scopes: SCOPES,
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
      extraParams: { nonce },
    });
    const result = await request.promptAsync(discovery);
    return result.type === 'success' ? (result.params.id_token ?? null) : null;
  }

  const redirectUri = googleIosRedirectUri(clientId);
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });
  const result = await request.promptAsync(discovery);
  if (result.type !== 'success' || !result.params.code) {
    return null;
  }
  const tokens = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    },
    discovery,
  );
  return tokens.idToken ?? null;
}
