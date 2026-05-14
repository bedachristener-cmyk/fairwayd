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

const tripsCacheKey = "fairwayd.trips";

function formatCachedAt(value?: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function readCachedTrips(): { trips: Trip[]; cachedAt: string | null } {
  try {
    const raw = window.localStorage.getItem(tripsCacheKey);
    if (!raw) return { trips: [], cachedAt: null };

    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "data" in parsed &&
      Array.isArray((parsed as { data?: unknown }).data)
    ) {
      const cached = parsed as { data: Trip[]; cachedAt?: unknown };

      return {
        trips: cached.data,
        cachedAt: typeof cached.cachedAt === "string" ? cached.cachedAt : null,
      };
    }

    return Array.isArray(parsed)
      ? { trips: parsed as Trip[], cachedAt: null }
      : { trips: [], cachedAt: null };
  } catch {
    return { trips: [], cachedAt: null };
  }
}

function writeCachedTrips(trips: Trip[]) {
  const cachedAt = new Date().toISOString();

  try {
    window.localStorage.setItem(
      tripsCacheKey,
      JSON.stringify({ cachedAt, data: trips }),
    );
  } catch {
    // Cache failures should not block the live trips list.
  }

  return cachedAt;
}

function tripDetailCacheKey(tripId: string) {
  return `fairwayd.trip.${tripId}`;
}

function writeCachedTripDetail(tripId: string, trip: unknown) {
  const cachedAt = new Date().toISOString();

  try {
    window.localStorage.setItem(
      tripDetailCacheKey(tripId),
      JSON.stringify({ cachedAt, data: trip }),
    );
  } catch {
    // Detail preload cache failures are non-critical.
  }
}

function timeValue(value?: string | null) {
  if (!value) return null;

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function nextTripItemTime(trip: Trip, todayTime: number) {
  const upcomingTimes =
    trip.items
      ?.flatMap((item) => [item.date ?? item.startsAt, item.endDate])
      .map(timeValue)
      .filter((time): time is number => time != null && time >= todayTime) ??
    [];

  return upcomingTimes.length > 0 ? Math.min(...upcomingTimes) : null;
}

function createdTripTime(trip: Trip) {
  return timeValue(trip.createdAt) ?? 0;
}

function tripsToPreload(trips: Trip[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const withUpcoming = trips
    .map((trip) => ({ trip, nextTime: nextTripItemTime(trip, todayTime) }))
    .filter((entry): entry is { trip: Trip; nextTime: number } => entry.nextTime != null)
    .sort((a, b) => a.nextTime - b.nextTime)
    .map((entry) => entry.trip);

  const upcomingIds = new Set(withUpcoming.map((trip) => trip.id));
  const newestRemaining = trips
    .filter((trip) => !upcomingIds.has(trip.id))
    .sort((a, b) => createdTripTime(b) - createdTripTime(a));

  return [...withUpcoming, ...newestRemaining].slice(0, 3);
}

async function preloadTripDetails(
  trips: Trip[],
  token: string,
  isCancelled: () => boolean,
) {
  const selectedTrips = tripsToPreload(trips);

  await Promise.all(
    selectedTrips.map(async (trip) => {
      if (isCancelled()) return;

      try {
        const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(trip.id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok || isCancelled()) return;

        const detail = await res.json();
        if (!isCancelled()) writeCachedTripDetail(trip.id, detail);
      } catch {
        // Ignore preload failures; the overview should stay responsive offline.
      }
    }),
  );
}

export default function TripsPage() {
  const nav = useNavigate();
  const { token } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showingCachedTrips, setShowingCachedTrips] = useState(false);
  const [cachedTripsAt, setCachedTripsAt] = useState<string | null>(null);

  async function loadTrips(options?: { cancelled?: () => boolean }) {
    if (!token) return;
    const isCancelled = options?.cancelled ?? (() => false);

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

      if (!isCancelled()) {
        const cachedAt = writeCachedTrips(list);
        setTrips(list);
        setCachedTripsAt(cachedAt);
        setShowingCachedTrips(false);
        void preloadTripDetails(list, token, isCancelled);
      }
    } catch (e: any) {
      if (isCancelled()) return;

      const cachedTrips = readCachedTrips();
      if (cachedTrips.trips.length > 0) {
        setTrips(cachedTrips.trips);
        setCachedTripsAt(cachedTrips.cachedAt);
        setShowingCachedTrips(true);
        setErr(null);
        return;
      }

      if (trips.length > 0) {
        setShowingCachedTrips(true);
        setErr(null);
        return;
      }

      setErr(e?.message ?? "Failed to load trips");
      setTrips([]);
      setCachedTripsAt(null);
      setShowingCachedTrips(false);
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    loadTrips({ cancelled: () => cancelled });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const headerText = useMemo(() => {
    if (loading && trips.length === 0) return "Trips";
    return trips.length === 1 ? "Trips · 1" : `Trips · ${trips.length}`;
  }, [loading, trips.length]);
  const isRefreshingTrips = loading && trips.length > 0;

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

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "flex-end",
            flex: "0 1 auto",
          }}
        >
          <button
            type="button"
            onClick={() => loadTrips()}
            disabled={loading}
            style={{
              height: 38,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor: loading ? "default" : "pointer",
              fontWeight: 850,
              fontSize: 13,
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          >
            {isRefreshingTrips ? "Updating..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => nav("/trips/new")}
            style={{
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
      </div>

      {showingCachedTrips ? (
        <div
          role="status"
          style={{
            padding: "9px 11px",
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--sub)",
            fontSize: 12,
            fontWeight: 850,
            lineHeight: 1.35,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ minWidth: 0, flex: "1 1 190px", display: "grid", gap: 2 }}>
            <span style={{ color: "var(--text)", fontWeight: 950 }}>
              Saved travel data
            </span>
            <span>Last updated: {formatCachedAt(cachedTripsAt)}</span>
          </span>
          <button
            type="button"
            onClick={() => loadTrips()}
            disabled={loading}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor: loading ? "default" : "pointer",
              fontWeight: 900,
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            {isRefreshingTrips ? "Updating..." : "Refresh"}
          </button>
        </div>
      ) : null}

      {isRefreshingTrips ? (
        <div style={{ color: "var(--sub)", fontSize: 12, fontWeight: 850 }}>
          Updating trips...
        </div>
      ) : null}

      {loading && trips.length === 0 ? (
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
                {coverUrl ? (
                  <div
                    aria-hidden="true"
                    className="fw-trip-cover-thumb"
                    style={{
                      width: 88,
                      height: 104,
                      minWidth: 88,
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      position: "relative",
                      boxSizing: "border-box",
                    }}
                  >
                    <img
                      className="fw-trip-cover-thumb-img"
                      src={coverUrl}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center 45%",
                        display: "block",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      width: 88,
                      height: 104,
                      minWidth: 88,
                      borderRadius: 14,
                      overflow: "hidden",
                      background:
                        "linear-gradient(135deg, var(--green), var(--muted))",
                      border: "1px solid var(--border)",
                      display: "grid",
                      alignContent: "end",
                      padding: 10,
                      color: "var(--bg)",
                      fontSize: 24,
                      fontWeight: 850,
                      boxSizing: "border-box",
                    }}
                  >
                    {flag || "Trip"}
                  </div>
                )}

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
