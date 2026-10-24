import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

type UserEntry = {
  id: string;
  name: string | null;
  handle: string | null;
  email: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
};
type Result = { total: number; page: number; pageSize: number; items: UserEntry[] };

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/users/admin/list?q=${encodeURIComponent(search)}&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 403) throw new Error("Admin access required.");
        if (!res.ok) throw new Error("Could not load registered users.");
        return res.json() as Promise<Result>;
      })
      .then(setData)
      .catch((err: Error) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, search, page]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 18px 90px", color: "var(--text)" }}>
      <Link to="/feedback-admin" style={{ color: "var(--sub)" }}>← Admin</Link>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Registered users</h1>
      <p style={{ color: "var(--sub)", marginTop: 0 }}>Admin-only directory · read-only</p>
      <label style={{ display: "grid", gap: 6, marginBottom: 20 }}>
        <span>Search name, handle or email</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search registered users..."
          style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" }}
        />
      </label>
      {error ? <p role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}
      {!error && <p style={{ color: "var(--sub)", fontSize: 13 }}>{loading ? "Loading..." : `${data?.total ?? 0} users found`}</p>}
      {!error && data && (
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650, textAlign: "left" }}>
            <thead><tr>{["Name", "Handle", "Email", "Registered", "Email verified"].map((heading) =>
              <th key={heading} style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>{heading}</th>)}</tr></thead>
            <tbody>{data.items.map((user) => (
              <tr key={user.id}>
                <td style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>{user.name || "—"}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>{user.handle ? `@${user.handle}` : "—"}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>{user.email || "—"}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>{user.emailVerifiedAt ? "Yes" : "No"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data && data.total > data.pageSize && !error ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((n) => n - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(data.total / data.pageSize)}</span>
          <button type="button" disabled={page * data.pageSize >= data.total || loading} onClick={() => setPage((n) => n + 1)}>Next</button>
        </div>
      ) : null}
    </main>
  );
}
