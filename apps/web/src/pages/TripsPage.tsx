import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";

type TripItem = {
  type?: string | null;
  date?: string | null;
  endDate?: string | null;
  startsAt?: string | null;
};

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
  coverImageUrl?: string | null;
  createdAt?: string | null;
  members?: unknown[];
  items?: TripItem[];
  _count?: {
    items?: number;
  };
};

function formatShortDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

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

function dateRange(items?: TripItem[]) {
  const times =
    items
      ?.flatMap((item) => [item.date ?? item.startsAt, item.endDate])
      .map((value) => (value ? new Date(value).getTime() : Number.NaN))
      .filter((value) => Number.isFinite(value)) ?? [];

  if (times.length === 0) return "";

  const min = new Date(Math.min(...times)).toISOString();
  const max = new Date(Math.max(...times)).toISOString();
  const start = formatShortDate(min);
  const end = formatShortDate(max);

  if (!start || !end) return "";
  return start === end ? start : `${start} - ${end}`;
}

function typeCounts(items?: TripItem[]) {
  const counts = {
    golf: 0,
    hotels: 0,
    flights: 0,
  };

  for (const item of items ?? []) {
    const type = String(item.type ?? "").toLowerCase();
    if (type === "golf_round" || type === "course") counts.golf += 1;
    if (type === "hotel") counts.hotels += 1;
    if (type === "flight" || type === "flights") counts.flights += 1;
  }

  return counts;
}

function destinationFlag(destination?: string | null) {
  const value = destination?.toLowerCase() ?? "";

  if (value.includes("thailand") || value.includes("thai")) return "TH";
  if (value.includes("switzerland") || value.includes("swiss")) return "CH";
  if (value.includes("portugal")) return "PT";
  if (value.includes("spain")) return "ES";
  if (value.includes("japan")) return "JP";
  if (value.includes("south africa")) return "ZA";
  if (value.includes("philippines")) return "PH";

  return "";
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
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        boxSizing: "border-box",
        padding: "16px 14px calc(96px + env(safe-area-inset-bottom, 0px))",
        display: "grid",
        gap: 16,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 220px", display: "grid", gap: 3 }}>
          <div style={{ fontSize: 22, lineHeight: 1.12, fontWeight: 850 }}>
            {headerText}
          </div>
          <div style={{ fontSize: 13, color: "var(--sub)" }}>
            Golf travel, tee times, stays, flights and shared planning.
          </div>
        </div>

        <button
          type="button"
          onClick={() => nav("/trips/new")}
          style={{
            flex: "0 1 auto",
            minWidth: 132,
            height: 40,
            padding: "0 14px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--text)",
            color: "var(--bg)",
            cursor: "pointer",
            fontWeight: 850,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
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
            borderRadius: 14,
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
            padding: 18,
            borderRadius: 16,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 850 }}>No trips yet</div>
          <div style={{ color: "var(--sub)", fontSize: 13 }}>
            Start with a destination and add tee times, hotels and flights as
            the plan takes shape.
          </div>
        </div>
      ) : null}

      {trips.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {trips.map((trip) => {
            const memberCount = trip.members?.length ?? 0;
            const itemCount = trip._count?.items ?? trip.items?.length ?? 0;
            const created = formatCreatedDate(trip.createdAt);
            const range = dateRange(trip.items);
            const counts = typeCounts(trip.items);
            const flag = destinationFlag(trip.destination);
            const coverUrl = fileUrl(trip.coverImageUrl);

            return (
              <article
                key={trip.id}
                onClick={() => nav(`/trips/${trip.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    nav(`/trips/${trip.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
                style={{
                  padding: 10,
                  borderRadius: 18,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  display: "grid",
                  gridTemplateColumns: "88px minmax(0, 1fr)",
                  gap: 12,
                  cursor: "pointer",
                  boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
                  overflow: "hidden",
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    height: 104,
                    minHeight: 104,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: coverUrl
                      ? "var(--card)"
                      : "linear-gradient(135deg, var(--green), var(--muted))",
                    border: "1px solid var(--border)",
                    position: "relative",
                  }}
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        alignContent: "end",
                        padding: 10,
                        color: "var(--bg)",
                        fontSize: 24,
                        fontWeight: 850,
                      }}
                    >
                      {flag || "Trip"}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    minWidth: 0,
                    display: "grid",
                    gap: 8,
                    alignContent: "space-between",
                  }}
                >
                  <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 17,
                        lineHeight: 1.2,
                        fontWeight: 850,
                        color: "var(--text)",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {trip.title}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 7,
                        color: "var(--sub)",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {trip.destination ? (
                        <span>{[flag, trip.destination].filter(Boolean).join(" ")}</span>
                      ) : null}
                      {range ? <span>{range}</span> : null}
                      {!range && created ? <span>Created {created}</span> : null}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 7,
                      color: "var(--sub)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>{memberCount} members</span>
                    <span>{itemCount} items</span>
                  </div>

                  {counts.golf || counts.hotels || counts.flights ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {counts.golf ? (
                        <StatPill label="Golf" value={counts.golf} />
                      ) : null}
                      {counts.hotels ? (
                        <StatPill label="Hotels" value={counts.hotels} />
                      ) : null}
                      {counts.flights ? (
                        <StatPill label="Flights" value={counts.flights} />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span
      style={{
        border: "1px solid var(--border)",
        borderRadius: 999,
        background: "var(--bg)",
        color: "var(--text)",
        padding: "4px 7px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {label} {value}
    </span>
  );
}
