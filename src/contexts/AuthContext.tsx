import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type UserType = 'LOJA' | 'GERENTE' | 'DIRECAO' | 'ADMINISTRATIVO' | 'TI';

export interface AuthLoja {
  id:     string;
  name:   string;
  cnpj:   string;
  cidade: string | null;
  sigla:  string;
}

export interface AuthUser {
  id:                string;
  name:              string;
  email:             string;
  type:              UserType;
  loja:              AuthLoja | null;
  lojas:             AuthLoja[]; // lojas do REGIONAL; vazio para outros tipos
  showActivityPanel: boolean;
}

interface AuthState {
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  login:  (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: (minLevel?: UserType) => boolean;
}

const LEVEL: Record<string, number> = {
  // Valores novos
  LOJA:           0,
  GERENTE:        1,
  DIRECAO:        2,
  ADMINISTRATIVO: 3,
  TI:             4,
  // Aliases legados — suporte a tokens emitidos antes da migração
  USER:     0,
  REGIONAL: 1,
  ADMIN_3:  2,
  ADMIN_2:  3,
  ADMIN_1:  4,
};

const USER_KEY = 'okrs_user';
const API_BASE   = import.meta.env.VITE_API_URL ?? 'https://okrsapideploy.vercel.app';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const user = localStorage.getItem(USER_KEY);
      if (user) return { user: JSON.parse(user) };
    } catch {}
    return { user: null };
  });

  // Valida sessão ao carregar — cookie HttpOnly é enviado automaticamente
  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error('expired'); return r.json(); })
      .then((user: AuthUser) => {
        setState({ user });
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
      .catch(() => {
        localStorage.removeItem(USER_KEY);
        setState({ user: null });
      });
  }, []); // só na montagem

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Falha no login.');

    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setState({ user: data.user });
  }, []);

  const logout = useCallback(() => {
    fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    localStorage.removeItem(USER_KEY);
    setState({ user: null });
  }, []);

  const isAdmin = useCallback((minLevel: UserType = 'DIRECAO') => {
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
