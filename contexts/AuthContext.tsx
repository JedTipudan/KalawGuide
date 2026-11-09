import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthSession, SignInCredentials, RegisterCredentials } from '../types';
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  restoreSession,
  signOut as authSignOut,
  updateUserRole,
} from '../services/auth/authService';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  googleSignIn: (googleUser: { id: string; email: string; name: string; picture?: string }) => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
  setRole: (role: User['role']) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Safety net: no matter what, clear the splash after 4 seconds
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 4000);

    async function init() {
      // First ensure the DB is open and migrated — this must complete before
      // anything else touches SQLite, including restoreSession and seed.
      try {
        const { getDatabase } = await import('../database/migrations/init');
        await getDatabase();
      } catch (e) {
        console.error('DB init error:', e);
      }

      try {
        const session = await Promise.race([
          restoreSession(),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
        if (!cancelled && session) setUser(session.user);
      } catch (e) {
        console.error('Session restore error:', e);
      } finally {
        clearTimeout(safetyTimer);
        if (!cancelled) setIsLoading(false);
      }

      // Seed runs after DB is confirmed open — getDatabase() returns the
      // cached promise so no second open occurs.
      try {
        const { seedDatabase } = await import('../database/seeds');
        await seedDatabase();
      } catch (e) {
        console.error('Seed error:', e);
      }
    }

    init();
    return () => { cancelled = true; clearTimeout(safetyTimer); };
  }, []);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    const session = await signInWithEmail(credentials);
    setUser(session.user);
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const session = await registerWithEmail(credentials);
    setUser(session.user);
  }, []);

  const googleSignIn = useCallback(async (googleUser: {
    id: string; email: string; name: string; picture?: string;
  }) => {
    const { session, isNewUser } = await signInWithGoogle(googleUser);
    setUser(session.user);
    return { isNewUser };
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
  }, []);

  const setRole = useCallback(async (role: User['role']) => {
    if (!user) return;
    await updateUserRole(user.id, role);
    setUser(prev => prev ? { ...prev, role } : null);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      register,
      googleSignIn,
      signOut,
      setRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
