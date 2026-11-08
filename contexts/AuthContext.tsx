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
import { seedDatabase } from '../database/seeds';

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
    async function init() {
      try {
        await seedDatabase();
        const session = await restoreSession();
        if (!cancelled && session) setUser(session.user);
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
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
