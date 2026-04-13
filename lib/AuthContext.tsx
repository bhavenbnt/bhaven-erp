'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  user_id: number;
  email: string;
  role: 'customer' | 'admin' | 'worker';
  name?: string;
  company_name?: string;
  contact_info?: string;
  is_super?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u && u !== 'undefined') {
      try { setUser(JSON.parse(u)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // loading 중에는 자식을 렌더하지 않음 — 각 페이지의 !user 체크가 리다이렉트하는 것 방지
  if (loading) {
    return (
      <AuthContext.Provider value={{ user, loading, login, logout }}>
        <div style={{ minHeight: '100vh', background: '#F5F5F5' }} />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
