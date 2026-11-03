import type { ISODateString, User } from './entities.js';

export type AuthProviderId = 'apple' | 'google' | 'email-password' | 'oidc';

/**
 * Represents the normalized account information returned by an auth provider.
 */
export interface AuthenticatedAccount {
  providerId: AuthProviderId;
  providerSubject: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Represents the app session issued after provider authentication succeeds.
 */
export interface AuthSession {
  user: User;
  account: AuthenticatedAccount;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: ISODateString;
}

/**
 * Represents credentials returned by Sign in with Apple.
 */
export interface AppleAuthCredential {
  providerId: 'apple';
  identityToken?: string;
  authorizationCode?: string;
  nonce?: string;
}

/**
 * Represents credentials returned by a future Google provider.
 */
export interface GoogleAuthCredential {
  providerId: 'google';
  idToken?: string;
  accessToken?: string;
}

/**
 * Represents credentials submitted by a future email/password provider.
 */
export interface EmailPasswordAuthCredential {
  providerId: 'email-password';
  email: string;
  password: string;
}

/**
 * Represents credentials submitted by a future self-hosted OIDC provider.
 */
export interface OidcAuthCredential {
  providerId: 'oidc';
  issuer: string;
  idToken?: string;
  accessToken?: string;
}

/**
 * Represents the provider credential payload sent from client to server.
 */
export type AuthProviderCredential =
  | AppleAuthCredential
  | GoogleAuthCredential
  | EmailPasswordAuthCredential
  | OidcAuthCredential;

/**
 * Represents a provider-agnostic sign-in request from app clients.
 */
export interface AuthSignInRequest {
  credential: AuthProviderCredential;
}

/**
 * Represents the client-side boundary for collecting provider credentials.
 */
export interface AuthClientProvider {
  id: AuthProviderId;
  label: string;
  createCredential(): Promise<AuthProviderCredential>;
}

/**
 * Represents the server-side boundary for validating provider credentials and issuing sessions.
 */
export interface AuthServerProvider {
  id: AuthProviderId;
  authenticate(credential: AuthProviderCredential): Promise<AuthSession | null>;
}

/** Email/password registration request. */
export interface EmailRegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

/** Email/password login request. */
export interface EmailLoginInput {
  email: string;
  password: string;
}

/**
 * Sign-in with a Google ID token obtained on the device (spec 0039). The
 * server verifies it with Google's keys before trusting anything in it.
 */
export interface GoogleSignInInput {
  idToken: string;
}

/** Response for register/login: a bearer token plus the user. */
export interface AuthTokenResponse {
  token: string;
  user: User;
}


/** Identity of the validated app session; uses the same user as sign-in. */
export type AuthIdentityResponse = Pick<AuthTokenResponse, 'user'>;
