'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';
import { User, AuthResponse, MeResponse, AccountType } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  accountType: AccountType | null;
  availableAccounts: AccountType[];
  setAccountType: (type: AccountType) => void;
  clearAccountType: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'crm_token';
const ACCOUNT_KEY = 'crm_account_type';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountType, setAccountTypeState] = useState<AccountType | null>(null);

  const saveToken = (t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
    setToken(null);
    setUser(null);
    setAccountTypeState(null);
  };

  const fetchUser = useCallback(async (t: string) => {
    try {
      const data = await api.get<MeResponse>('/me', t);
      setUser(data.user);
      setToken(t);
      // Auto-select if user has only one available account
      const stored = localStorage.getItem(ACCOUNT_KEY) as AccountType | null;
      const available = data.user.available_accounts ?? [];
      if (stored && available.includes(stored)) {
        setAccountTypeState(stored);
      } else if (available.length === 1) {
        localStorage.setItem(ACCOUNT_KEY, available[0]);
        setAccountTypeState(available[0]);
      } else {
        setAccountTypeState(null);
        if (stored) localStorage.removeItem(ACCOUNT_KEY);
      }
    } catch {
      clearAuth();
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      fetchUser(storedToken).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const setAccountType = (type: AccountType) => {
    localStorage.setItem(ACCOUNT_KEY, type);
    setAccountTypeState(type);
  };

  const clearAccountType = () => {
    localStorage.removeItem(ACCOUNT_KEY);
    setAccountTypeState(null);
  };

  const login = async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/login', { email, password });
    saveToken(data.token);
    setUser(data.user);
    const available = data.user.available_accounts ?? [];
    if (available.length === 1) {
      localStorage.setItem(ACCOUNT_KEY, available[0]);
      setAccountTypeState(available[0]);
    } else {
      localStorage.removeItem(ACCOUNT_KEY);
      setAccountTypeState(null);
    }
  };

  const register = async (name: string, email: string, password: string, passwordConfirmation: string) => {
    const data = await api.post<AuthResponse>('/register', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
    saveToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/logout', undefined, token);
      }
    } finally {
      clearAuth();
    }
  };

  const hasRole = (role: string) => user?.roles.includes(role) ?? false;

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]) => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return permissions.some((p) => user.permissions.includes(p));
  };

  const availableAccounts = user?.available_accounts ?? [];

  return (
    <AuthContext.Provider
      value={{
        user, token, isLoading,
        accountType, availableAccounts, setAccountType, clearAccountType,
        login, register, logout, hasRole, hasPermission, hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
