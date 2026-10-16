import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { authClient } from '@/features/auth/api/authClient';
import { tokenStorage } from '@/features/auth/tokenStorage';
import { tokenSubject } from '@/features/auth/tokenSubject';
import { discardActiveWorkoutIfForeign } from '@/features/workouts/state/workoutDraftStore';
import { setAuthToken, setOnUnauthorized } from '@/lib/http';
import type { User } from '@workout/domain';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await tokenStorage.clear();
  }, []);

  // Restore a stored token on launch.
  useEffect(() => {
    let active = true;
    tokenStorage
      .get()
      .then((token) => {
        if (active && token) {
          setAuthToken(token);
          // No /me endpoint yet (spec 0001): a stored token means signed in,
          // and its subject is who. 'me' only for an unreadable token.
          const id = tokenSubject(token) ?? 'me';
          setUser((current) => current ?? { id, displayName: '', createdAt: '', updatedAt: '' });
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Sign out automatically if the API rejects the token.
  useEffect(() => {
    setOnUnauthorized(() => {
      void signOut();
    });
    return () => setOnUnauthorized(null);
  }, [signOut]);

  const persist = useCallback(async (token: string, nextUser: User) => {
    // A workout left in memory by someone else must not carry over (FR-8).
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        signIn,
        register,
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
