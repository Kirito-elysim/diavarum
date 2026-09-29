import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, authApi, setSessionExpiredHandler } from '../lib/api';
import type { Me } from '../api/types';

interface AuthContextType {
  user: Me | null;
  isLoading: boolean;
  /** Cadre ou administrateur national (gestion des IDE, statistiques) */
  isCadre: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    setUser(await api<Me>('/me'));
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);

    // Rechargement de page : le JWT (en mémoire) est perdu, le cookie de refresh le régénère
    authApi
      .restoreSession()
      .then((restored) => (restored ? refreshUser() : undefined))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [clearSession, refreshUser]);

  const login = async (email: string, password: string) => {
    await authApi.login(email, password);
    await refreshUser();
  };

  const logout = async () => {
    await authApi.logout();
    clearSession();
  };

  const isAdmin = user?.role === 'admin_national';
  const isCadre = isAdmin || user?.role === 'cadre';

  return (
    <AuthContext.Provider value={{ user, isLoading, isCadre, isAdmin, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
