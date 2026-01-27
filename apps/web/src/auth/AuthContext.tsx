import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Me = {
  id: string;
  handle?: string | null;
  name?: string | null;
  provider?: string | null;
  createdAt?: string;
};

type AuthState = {
  token: string | null;
  user: Me | null;
  loading: boolean;
  isAuthenticated: boolean; // ✅ will be token-based (stable)
  login: (token: string) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = "fairwayd_token";
const FALLBACK_KEYS = ["token", "jwt", "access_token"]; // ✅ helps if old key was used
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function loadTokenFromStorage() {
  const direct = localStorage.getItem(STORAGE_KEY);
  if (direct && direct.trim()) return direct.trim();

  for (const k of FALLBACK_KEYS) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const login = (newToken: string) => {
    const t = newToken?.trim();
    if (!t) return;
    setToken(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  const refreshMe = async () => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ If /auth/me is not ready yet or fails, don't instantly kick user out.
      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  // ✅ Restore token once on boot
  useEffect(() => {
    try {
      const saved = loadTokenFromStorage();
      setToken(saved);
    } finally {
      // We are "ready" to render protected routes (token might be null, that's fine)
      setLoading(false);
    }
  }, []);

  // ✅ Optionally load user info in background when token exists
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      loading,
      // ✅ STABLE: allow access if token exists (prevents redirect loops)
      isAuthenticated: !!token,
      login,
      logout,
      refreshMe,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
