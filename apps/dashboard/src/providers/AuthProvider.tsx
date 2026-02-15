'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@mktengine/shared';
import {
  apiClient,
  setAccessToken,
  clearAccessToken,
} from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginResponse {
  accessToken: string;
  user: User;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshToken = useCallback(async () => {
    try {
      const response = await apiClient<LoginResponse>('/api/auth/refresh', {
        method: 'POST',
      });
      setAccessToken(response.data.accessToken);
      setState({
        user: response.data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      clearAccessToken();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setAccessToken(response.data.accessToken);
    setState({
      user: response.data.user,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await apiClient<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: data,
    });
    setAccessToken(response.data.accessToken);
    setState({
      user: response.data.user,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed with local logout even if API fails
    }
    clearAccessToken();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, refreshToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
