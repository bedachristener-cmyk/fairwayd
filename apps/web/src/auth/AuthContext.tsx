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
  avatarUrl?: string | null;
};

type AuthState = {
  token: string | null;
  user: Me | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, rememberMe?: boolean) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const STORAGE_KEY = "fairwayd_token";
const FALLBACK_KEYS = ["token", "jwt", "access_token"];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function loadTokenFromStorage(): string | null {
  // 1) offizieller Key in local + session
  const direct =
    localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
  if (direct && direct.trim()) return direct.trim();

  // 2) Altlasten / Fallback keys
  for (const k of FALLBACK_KEYS) {
    const v = localStorage.getItem(k) ?? sessionStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    loadTokenFromStorage(),
  );
  const [user, setUser] = useState<Me | null>(null);

  const [loading, setLoading] = useState<boolean>(!!token);

  const logout = () => {
    setToken(null);
    setUser(null);
    setLoading(false);

    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);

    for (const k of FALLBACK_KEYS) {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    }
  };

  const refreshMe = async () => {
    const t = token?.trim();
    if (!t) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = (await res.json()) as Me;
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  const login = (newToken: string, rememberMe = true) => {
    const t = (newToken ?? "").trim();
    if (!t) return;

    // state zuerst
    setToken(t);
    setUser(null);
    setLoading(true);

    // cleanup / konsistent speichern
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    for (const k of FALLBACK_KEYS) {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    }

    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(STORAGE_KEY, t);
  };

  // Wenn token gesetzt ist, user laden
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      await refreshMe();
      if (cancelled) return;
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isAuthenticated = !!token;

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      loading,
      isAuthenticated,
      login,
      logout,
      refreshMe,
    }),
    [token, user, loading, isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
