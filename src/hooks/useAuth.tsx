import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { UserRole, User } from '@/data/mockData';
import { USERS } from '@/data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isRegionalAdmin: boolean;
  isCDOLeader: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Default to Super Admin (Franklin Graham) — most impressive entry point for demo.
  const [user, setUser] = useState<User | null>(USERS[0]);

  const login = useCallback((role: UserRole) => {
    const found = USERS.find(u => u.role === role);
    if (found) setUser(found);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const switchRole = useCallback((role: UserRole) => {
    const found = USERS.find(u => u.role === role);
    if (found) setUser(found);
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = isSuperAdmin || user?.role === 'admin';
  const isRegionalAdmin = isAdmin || user?.role === 'regional';
  const isCDOLeader = isRegionalAdmin || user?.role === 'cdo_leader';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isSuperAdmin,
      isAdmin,
      isRegionalAdmin,
      isCDOLeader,
      login,
      logout,
      switchRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
