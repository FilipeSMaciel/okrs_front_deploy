import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type UserType = 'USER' | 'ADMIN_3' | 'ADMIN_2' | 'ADMIN_1';

export interface AuthLoja {
  id:     string;
  name:   string;
  cnpj:   string;
  cidade: string | null;
}

export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
  type:  UserType;
  loja:  AuthLoja | null;
}

interface AuthState {
  user:  AuthUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login:  (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: (minLevel?: UserType) => boolean;
}

const LEVEL: Record<UserType, number> = {
  USER:    0,
  ADMIN_3: 1,
  ADMIN_2: 2,
  ADMIN_1: 3,
};

const TOKEN_KEY  = 'okrs_token';
const USER_KEY   = 'okrs_user';
const API_BASE   = import.meta.env.VITE_API_URL ?? 'https://okrsapideploy.vercel.app';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const user  = localStorage.getItem(USER_KEY);
      if (token && user) return { token, user: JSON.parse(user) };
    } catch {}
    return { token: null, user: null };
  });

  // Valida o token ao carregar (pode ter expirado)
  useEffect(() => {
    if (!state.token) return;
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${state.token}` },
    })
      .then(r => { if (!r.ok) throw new Error('expired'); return r.json(); })
      .then((user: AuthUser) => {
        setState(s => ({ ...s, user }));
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setState({ token: null, user: null });
      });
  }, []); // só na montagem

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Falha no login.');

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setState({ token: data.token, user: data.user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ token: null, user: null });
  }, []);

  const isAdmin = useCallback((minLevel: UserType = 'ADMIN_3') => {
    if (!state.user) return false;
    return (LEVEL[state.user.type] ?? 0) >= (LEVEL[minLevel] ?? 0);
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
