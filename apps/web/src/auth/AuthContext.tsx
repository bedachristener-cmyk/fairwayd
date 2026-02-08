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
  isAuthenticated: boolean; // => token vorhanden (nicht "user geladen")
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
  // ✅ Token synchron initialisieren => kein Redirect-Race beim direkten Aufruf
  const [token, setToken] = useState<string | null>(() =>
    loadTokenFromStorage(),
  );
  const [user, setUser] = useState<Me | null>(null);

  // loading = "wir prüfen /users/me" (nur wenn token vorhanden)
  const [loading, setLoading] = useState<boolean>(!!token);

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
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Token exists but no longer valid (e.g., DB reset => user missing)
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

  // ✅ Wenn token sich ändert: user laden/prüfen
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

  // ✅ Authenticated = Token vorhanden.
  // OnboardingGuard sorgt dann dafür, dass /users/me ok ist und Terms/Profile stimmen.
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
