import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
  createdAt?: string | null;
  members?: unknown[];
  _count?: {
    items?: number;
  };
};

function formatCreatedDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function TripsPage() {
  const nav = useNavigate();
  const { token } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTrips() {
      if (!token) return;

      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(`${API_BASE}/trips`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
        }

        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        if (!cancelled) {
          setTrips(list);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Failed to load trips");
          setTrips([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTrips();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const headerText = useMemo(() => {
    if (loading) return "Trips";
    return trips.length === 1 ? "Trips · 1" : `Trips · ${trips.length}`;
  }, [loading, trips.length]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 950 }}>{headerText}</div>
          <div style={{ fontSize: 13, color: "var(--sub)" }}>
            Plan golf travel with your group
          </div>
        </div>

        <button
          type="button"
          onClick={() => nav("/trips/new")}
          style={{
            marginLeft: "auto",
            height: 38,
            padding: "0 13px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            cursor: "pointer",
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          + New Trip
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--sub)", fontSize: 13 }}>Loading...</div>
      ) : null}

      {err ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      ) : null}

      {!loading && !err && trips.length === 0 ? (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--sub)",
            fontSize: 13,
          }}
        >
          No trips yet
        </div>
      ) : null}

      {trips.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {trips.map((trip) => {
            const memberCount = trip.members?.length ?? 0;
            const itemCount = trip._count?.items ?? 0;
            const created = formatCreatedDate(trip.createdAt);

            return (
              <article
                key={trip.id}
                onClick={() => nav(`/trips/${trip.id}`)}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  display: "grid",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 950,
                      color: "var(--text)",
                    }}
                  >
                    {trip.title}
                  </div>

                  {trip.destination ? (
                    <div style={{ fontSize: 13, color: "var(--sub)" }}>
                      {trip.destination}
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    color: "var(--sub)",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <span>{memberCount} members</span>
                  <span>{itemCount} items</span>
                  {created ? <span>{created}</span> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
