import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  sessionBootDecision,
  type SessionBootOutcome,
  tokenReadFailureAction,
} from '@/features/auth/sessionBoot';
import { authClient } from '@/features/auth/api/authClient';
import { tokenStorage } from '@/features/auth/tokenStorage';
import { discardActiveWorkoutIfForeign } from '@/features/workouts/state/workoutDraftStore';
import { ApiError, getAuthToken, setAuthToken, setOnUnauthorized } from '@/lib/http';
import type { User } from '@workout/domain';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  isCheckingSession: boolean;
  retrySession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  /** Signs in with an ID token from Google's sheet (spec 0039 FR-2). */
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const generation = useRef(0);

  const signOut = useCallback(async () => {
    generation.current += 1;
    setIsOffline(false);
    setIsCheckingSession(false);
    setIsLoading(false);
    setAuthToken(null);
    setUser(null);
    await tokenStorage.clear();
  }, []);

  const validateSession = useCallback(async (token: string, version: number) => {
    setIsCheckingSession(true);
    let outcome: SessionBootOutcome;
    try {
      const identity = await authClient.me();
      outcome = { kind: 'validated', user: identity.user };
    } catch (error) {
      outcome = error instanceof ApiError && error.status === 401
        ? { kind: 'rejected' }
        : { kind: 'unreachable' };
    }
    if (version !== generation.current) return;
    const decision = sessionBootDecision(token, outcome);
    setIsCheckingSession(false);
    if (decision.clearToken) {
      await signOut();
    } else {
      setUser(decision.user);
      setIsOffline(decision.status === 'offline');
    }
  }, [signOut]);

  useEffect(() => {
    const version = ++generation.current;
    let waitForActive: { remove: () => void } | null = null;

    const readToken = async (): Promise<'done' | 'retry'> => {
      try {
        const token = await tokenStorage.get();
        if (version !== generation.current) return 'done';
        if (token) {
          setAuthToken(token);
          await validateSession(token, version);
        }
        return 'done';
      } catch {
        // A storage failure must release the startup screen too — unless the
        // app was launched in the background with the phone locked, where the
        // token cannot be read until it is unlocked (spec 0045 EF-2).
        return tokenReadFailureAction(AppState.currentState) === 'retry-when-active' ? 'retry' : 'done';
      }
    };
    const release = () => {
      if (version === generation.current) setIsLoading(false);
    };

    void (async () => {
      if ((await readToken()) === 'done' || version !== generation.current) {
        release();
        return;
      }
      waitForActive = AppState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        waitForActive?.remove();
        waitForActive = null;
        void readToken().finally(release);
      });
    })();
    return () => {
      generation.current += 1;
      waitForActive?.remove();
    };
  }, [validateSession]);

  const retrySession = useCallback(async () => {
    const token = getAuthToken();
    if (token && !isCheckingSession) {
      await validateSession(token, ++generation.current);
    }
  }, [isCheckingSession, validateSession]);

  // Sign out automatically if the API rejects the token.
  useEffect(() => {
    setOnUnauthorized(() => {
      void signOut();
    });
    return () => setOnUnauthorized(null);
  }, [signOut]);

  const persist = useCallback(async (token: string, nextUser: User) => {
    // A workout left in memory by someone else must not carry over (FR-8).
    generation.current += 1;
    setIsOffline(false);
    setIsCheckingSession(false);
    discardActiveWorkoutIfForeign(nextUser.id);
    setAuthToken(token);
    await tokenStorage.set(token);
    setUser(nextUser);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token, user: nextUser } = await authClient.login({ email, password });
      await persist(token, nextUser);
    },
    [persist],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const { token, user: nextUser } = await authClient.register({
        email,
        password,
        displayName,
      });
      await persist(token, nextUser);
    },
    [persist],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const { token, user: nextUser } = await authClient.google({ idToken });
      await persist(token, nextUser);
    },
    [persist],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        isOffline,
        isCheckingSession,
        retrySession,
        signIn,
        register,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
}
