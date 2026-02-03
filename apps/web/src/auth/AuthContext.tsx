import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const STORAGE_KEY = "fairwayd_token";
const FALLBACK_KEYS = ["token", "jwt", "access_token"];
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

  // Optional: keep for debugging / legacy screens
  const refreshMe = async () => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // If this endpoint isn't fully wired, don't break the session;
      // onboarding uses /users/me anyway.
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      setUser(data);
    } catch {
      // don't hard-clear user; token is source of truth
      return;
    }
  };

  // Restore token once on boot
  useEffect(() => {
    try {
      const saved = loadTokenFromStorage();
      setToken(saved);
    } finally {
      setLoading(false);
    }
  }, []);

  // If token changes: clear stale user; optionally refresh background
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
      isAuthenticated: !!token,
      login,
      logout,
      refreshMe,
    }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
