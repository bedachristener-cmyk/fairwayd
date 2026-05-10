import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { fileUrl } from "../api/fileUrl";

type TripItem = {
  id: string;
  type?: string | null;
  title?: string | null;
  notes?: string | null;
  date?: string | null;
  endDate?: string | null;
  startsAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  provider?: string | null;
  bookingRef?: string | null;
  directPrice?: number | null;
  caddyFee?: number | null;
  cartFee?: number | null;
  providerPrice?: number | null;
  currency?: string | null;
  locationName?: string | null;
  address?: string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  courseId?: string | null;
  course?: {
    id: string;
    name?: string | null;
    lat?: number | string | null;
    lon?: number | string | null;
  } | null;
};

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  members?: TripMember[];
  items?: TripItem[];
};

type TripRole = "OWNER" | "ADMIN" | "MEMBER";

type TripMember = {
  id: string;
  userId: string;
  role: TripRole;
  user?: {
    id: string;
    handle?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
};

type UserSearchResult = {
  id: string;
  handle?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
};

type TripEditDraft = {
  title: string;
  destination: string;
  description: string;
};

type EditDraft = {
  type: string;
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  provider: string;
  notes: string;
  directPrice: string;
  providerPrice: string;
  currency: string;
};

type TripView = "timeline" | "map";

type TripMapMarker = {
  id: string;
  number: number;
  title: string;
  typeLabel: string;
  typeKey: string;
  dateLabel: string;
  startTime: string;
  timeLabel: string;
  courseId?: string | null;
  courseName?: string | null;
  locationName?: string | null;
  address?: string | null;
  lat: number;
  lon: number;
};

type TripSummaryStat = {
  label: string;
  value: number;
};

type BudgetCategory = "Golf" | "Hotel" | "Transfer" | "Activity" | "Other";

type BudgetSummary = {
  mixedCurrencies: boolean;
  currency: string;
  total: number;
  perPerson: number;
  directTotal: number;
  providerTotal: number;
  caddyTotal: number;
  cartTotal: number;
  categories: Record<BudgetCategory, number>;
};

type TimelineDetail = {
  label: string;
  value: string;
};

const memberAvatarSize = 28;

const satelliteTileUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const satelliteLabelsUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const satelliteTileAttribution =
  "&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const itemTypeOptions = [
  { value: "golf_round", label: "Golf round" },
  { value: "hotel", label: "Hotel" },
  { value: "transfer", label: "Transfer" },
  { value: "car_rental", label: "Car rental" },
  { value: "free_day", label: "Free day" },
  { value: "note", label: "Note" },
];

const memberRoleOptions: TripRole[] = ["MEMBER", "ADMIN", "OWNER"];

const editFieldStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  padding: "9px 10px",
  font: "inherit",
};

const safeSectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const wrappingActionRowStyle: React.CSSProperties = {
  ...safeSectionStyle,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  justifyContent: "flex-start",
  minWidth: 0,
};

function itemIcon(type?: string | null) {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "🏌";
  if (value === "hotel") return "🏨";
  if (value === "transfer") return "🚗";
  if (value === "car_rental") return "🚙";
  if (value === "free_day") return "🌴";
  return "📝";
}

function itemDateValue(item: TripItem) {
  return item.date ?? item.startsAt ?? null;
}

function itemTypeLabel(type?: string | null) {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer") return "Transfer";
  if (value === "car_rental") return "Car rental";
  if (value === "free_day") return "Activity";
  return "Other";
}

function budgetCategory(type?: string | null): BudgetCategory {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer" || value === "car_rental") return "Transfer";
  if (value === "free_day") return "Activity";
  return "Other";
}

function dateKey(item: TripItem) {
  const value = itemDateValue(item);
  if (!value) return "unscheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unscheduled";

  return date.toISOString().slice(0, 10);
}

function formatDateLabel(key: string) {
  if (key === "unscheduled") return "Unscheduled";

  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Unscheduled";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatItemDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(item: TripItem) {
  if (item.startTime) return item.startTime;
  if (!item.startsAt) return "";

  const date = new Date(item.startsAt);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTimeRange(item: TripItem) {
  const start = formatTime(item);
  const end = item.endTime?.trim() || "";

  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function formatMoney(value?: number | null, currency?: string | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";

  const code = currency?.trim() || "CHF";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value} ${code}`.trim();
  }
}

function budgetAmount(value: number, summary: BudgetSummary) {
  if (summary.mixedCurrencies) return value > 0 ? "Mixed currencies" : formatMoney(0, summary.currency);
  return formatMoney(value, summary.currency);
}

function pricingParts(item: TripItem) {
  return [
    item.directPrice
      ? `Direct ${formatMoney(item.directPrice, item.currency)}`
      : "",
    item.providerPrice
      ? `Provider ${formatMoney(item.providerPrice, item.currency)}`
      : "",
    item.caddyFee ? `Caddy ${formatMoney(item.caddyFee, item.currency)}` : "",
    item.cartFee ? `Cart ${formatMoney(item.cartFee, item.currency)}` : "",
  ].filter(Boolean);
}

function dateInputValue(item: TripItem) {
  const value = itemDateValue(item);
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function endDateInputValue(item: TripItem) {
  if (!item.endDate) return "";

  const date = new Date(item.endDate);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatDateRange(item: TripItem) {
  const start = formatItemDate(itemDateValue(item));
  const end = formatItemDate(item.endDate);

  if (!start || !end) return "";

  const startKey = dateKey(item);
  const endDate = new Date(item.endDate as string);
  const endKey = Number.isNaN(endDate.getTime())
    ? ""
    : endDate.toISOString().slice(0, 10);

  if (!endKey || startKey === endKey) return "";
  return `${start} - ${end}`;
}

function timelineDetails(item: TripItem) {
  const details: TimelineDetail[] = [];

  if (item.provider?.trim()) {
    details.push({ label: "Provider", value: item.provider.trim() });
  }

  if (item.locationName?.trim()) {
    details.push({ label: "Location", value: item.locationName.trim() });
  }

  if (item.address?.trim()) {
    details.push({ label: "Address", value: item.address.trim() });
  }

  if (item.bookingRef?.trim()) {
    details.push({ label: "Booking", value: item.bookingRef.trim() });
  }

  return details;
}

function numberInputValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function optionalText(value: string) {
  const text = value.trim();
  return text || undefined;
}

function optionalNumber(value: string) {
  const text = value.trim();
  if (!text) return undefined;

  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function errorMessageForResponse(status: number, fallback: string) {
  if (status === 403) return "Only trip admins can edit this item.";
  return fallback;
}

function tripErrorMessageForResponse(status: number, fallback: string) {
  if (status === 403) return "Only trip admins can edit this trip.";
  return fallback;
}

function memberErrorMessageForResponse(status: number, fallback: string) {
  if (status === 403) return "Only trip admins can manage members.";
  if (status === 409) return "This user is already a trip member.";
  return fallback;
}

function displayUserName(user?: UserSearchResult | null) {
  return user?.name || user?.handle || "Fairwayd user";
}

function toFiniteNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function markerTypeStyles(typeKey: string) {
  const value = String(typeKey ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") {
    return {
      background: "var(--text)",
      color: "var(--bg)",
      ring: "var(--card)",
      glyph: "G",
    };
  }

  if (value === "hotel") {
    return {
      background: "var(--card)",
      color: "var(--text)",
      ring: "var(--text)",
      glyph: "H",
    };
  }

  if (value === "transfer" || value === "car_rental") {
    return {
      background: "var(--bg)",
      color: "var(--text)",
      ring: "var(--sub)",
      glyph: "T",
    };
  }

  if (value === "free_day") {
    return {
      background: "var(--bg)",
      color: "var(--sub)",
      ring: "var(--text)",
      glyph: "A",
    };
  }

  return {
    background: "var(--card)",
    color: "var(--sub)",
    ring: "var(--border)",
    glyph: "O",
  };
}

function tripMarkerIcon(marker: TripMapMarker) {
  const styles = markerTypeStyles(marker.typeKey);

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${styles.background};
        color: ${styles.color};
        border: 2px solid ${styles.ring};
        box-shadow: 0 4px 14px rgba(0,0,0,.22);
        font: 950 11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <span style="
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          line-height: 1;
        ">
          <span>${marker.number}</span>
          <span style="font-size: 8px;">${styles.glyph}</span>
        </span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function FitTripMapBounds({ markers }: { markers: TripMapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    window.setTimeout(() => map.invalidateSize(), 50);

    if (markers.length === 0) return;

    const points = markers.map((marker) => [marker.lat, marker.lon] as [
      number,
      number,
    ]);
    const bounds = L.latLngBounds(points);

    if (markers.length === 1) {
      map.setView(points[0], 13);
      return;
    }

    map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 12,
    });
  }, [map, markers]);

  return null;
}

function TripMapView({
  markers,
  onOpenCourse,
}: {
  markers: TripMapMarker[];
  onOpenCourse: (courseId: string) => void;
}) {
  const center = useMemo<[number, number]>(() => {
    const first = markers[0];
    return first ? [first.lat, first.lon] : [20, 0];
  }, [markers]);
  const line = markers.map((marker) => [marker.lat, marker.lon] as [
    number,
    number,
  ]);

  if (markers.length === 0) {
    return (
      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text)" }}>
            Trip Map
          </div>
          <div style={{ fontSize: 13, color: "var(--sub)" }}>
            Timeline items with valid coordinates
          </div>
        </div>
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--sub)",
            fontSize: 13,
            display: "grid",
            gap: 4,
          }}
        >
          <div style={{ color: "var(--text)", fontWeight: 950 }}>
            No mapped stops yet
          </div>
          <div>
            Add a linked course or a timeline item with coordinates to see it on the trip map.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text)" }}>
          Trip Map
        </div>
        <div style={{ fontSize: 13, color: "var(--sub)" }}>
          Timeline stops with valid coordinates
        </div>
      </div>

      <div
        style={{
          height: 380,
          minHeight: 320,
          maxHeight: "62vh",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <MapContainer
          center={center}
          zoom={8}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution={satelliteTileAttribution}
            url={satelliteTileUrl}
          />
          <TileLayer
            attribution={satelliteTileAttribution}
            url={satelliteLabelsUrl}
          />
          <FitTripMapBounds markers={markers} />

          {line.length > 1 ? (
            <Polyline
              positions={line}
              pathOptions={{
                color: "var(--text)",
                opacity: 0.72,
                weight: 3,
              }}
            />
          ) : null}

          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lon]}
              icon={tripMarkerIcon(marker)}
            >
              <Popup>
                <div
                  style={{
                    minWidth: 210,
                    display: "grid",
                    gap: 9,
                    color: "var(--text)",
                    fontFamily: "system-ui",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          padding: "3px 7px",
                          color: "var(--sub)",
                          fontSize: 11,
                          fontWeight: 950,
                        }}
                      >
                        {marker.number}. {marker.typeLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 950,
                        fontSize: 14,
                        lineHeight: 1.25,
                      }}
                    >
                      {marker.title}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      color: "var(--sub)",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <span>{marker.dateLabel}</span>
                    {marker.timeLabel ? <span>{marker.timeLabel}</span> : null}
                  </div>
                  {marker.courseName ||
                  marker.locationName ||
                  marker.address ? (
                    <div style={{ display: "grid", gap: 5, fontSize: 12 }}>
                      {marker.courseName ? (
                        <div style={{ color: "var(--sub)", lineHeight: 1.35 }}>
                          <span style={{ fontWeight: 950 }}>Course </span>
                          <span style={{ color: "var(--text)" }}>
                            {marker.courseName}
                          </span>
                        </div>
                      ) : null}
                      {marker.locationName ? (
                        <div style={{ color: "var(--sub)", lineHeight: 1.35 }}>
                          <span style={{ fontWeight: 950 }}>Location </span>
                          <span style={{ color: "var(--text)" }}>
                            {marker.locationName}
                          </span>
                        </div>
                      ) : null}
                      {marker.address ? (
                        <div style={{ color: "var(--sub)", lineHeight: 1.35 }}>
                          <span style={{ fontWeight: 950 }}>Address </span>
                          <span style={{ color: "var(--text)" }}>
                            {marker.address}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {marker.courseId ? (
                    <button
                      type="button"
                      onClick={() => onOpenCourse(marker.courseId as string)}
                      style={{
                        width: "fit-content",
                        height: 30,
                        padding: "0 10px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--sub)",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 12,
                      }}
                    >
                      Open course
                    </button>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

function MemberAvatar({ user }: { user?: UserSearchResult | null }) {
  const label = displayUserName(user);

  if (user?.avatarUrl) {
    return (
      <img
        src={fileUrl(user.avatarUrl)}
        alt={label}
        style={{
          width: memberAvatarSize,
          height: memberAvatarSize,
          minWidth: memberAvatarSize,
          maxWidth: memberAvatarSize,
          minHeight: memberAvatarSize,
          maxHeight: memberAvatarSize,
          boxSizing: "border-box",
          borderRadius: 999,
          objectFit: "cover",
          display: "block",
          border: "1px solid var(--border)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: memberAvatarSize,
        height: memberAvatarSize,
        minWidth: memberAvatarSize,
        maxWidth: memberAvatarSize,
        minHeight: memberAvatarSize,
        maxHeight: memberAvatarSize,
        boxSizing: "border-box",
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        fontWeight: 950,
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function TripDetailPage() {
  const { tripId } = useParams();
  const nav = useNavigate();
  const { token, user } = useAuth();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<TripView>("timeline");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [tripDraft, setTripDraft] = useState<TripEditDraft | null>(null);
  const [savingTrip, setSavingTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [newMemberRole, setNewMemberRole] = useState<TripRole>("MEMBER");
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  const myMembership = trip?.members?.find((member) => member.userId === user?.id);
  const canEditTrip =
    myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";

  async function loadTrip() {
    if (!token || !tripId) return;

    try {
      setLoading(true);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      const data = await res.json();
      setTrip(data);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load trip");
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tripId]);

  useEffect(() => {
    let cancelled = false;

    async function searchUsers() {
      if (!token || !canEditTrip) {
        setMemberResults([]);
        return;
      }

      const q = memberQuery.trim();
      if (q.length < 2 || selectedUser) {
        setMemberResults([]);
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/users/search?q=${encodeURIComponent(q)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) {
          if (!cancelled) setMemberResults([]);
          return;
        }

        const data = await res.json();
        const existingIds = new Set(trip?.members?.map((m) => m.userId) ?? []);
        const items = (Array.isArray(data) ? data : [])
          .filter((item: UserSearchResult) => !existingIds.has(item.id))
          .slice(0, 8);

        if (!cancelled) setMemberResults(items);
      } catch {
        if (!cancelled) setMemberResults([]);
      }
    }

    searchUsers();

    return () => {
      cancelled = true;
    };
  }, [canEditTrip, memberQuery, selectedUser, token, trip?.members]);

  function startEdit(item: TripItem) {
    setErr(null);
    setEditingItemId(item.id);
    setEditDraft({
      type: item.type || "note",
      title: item.title || "",
      date: dateInputValue(item),
      endDate: endDateInputValue(item),
      startTime: item.startTime || "",
      provider: item.provider || "",
      notes: item.notes || "",
      directPrice: numberInputValue(item.directPrice),
      providerPrice: numberInputValue(item.providerPrice),
      currency: item.currency || "",
    });
  }

  function startTripEdit() {
    if (!trip) return;

    setErr(null);
    setEditingTrip(true);
    setTripDraft({
      title: trip.title || "",
      destination: trip.destination || "",
      description: trip.description || "",
    });
  }

  async function saveTripEdit() {
    if (!tripId || !token || !tripDraft) return;

    if (!tripDraft.title.trim()) {
      setErr("Title is required.");
      return;
    }

    try {
      setSavingTrip(true);
      setErr(null);

      const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: tripDraft.title.trim(),
          destination: optionalText(tripDraft.destination),
          description: optionalText(tripDraft.description),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          tripErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setEditingTrip(false);
      setTripDraft(null);
      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save trip");
    } finally {
      setSavingTrip(false);
    }
  }

  async function deleteTrip() {
    if (!tripId || !token) return;
    if (!window.confirm("Delete this trip?")) return;

    try {
      setDeletingTrip(true);
      setErr(null);

      const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          tripErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      nav("/trips");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete trip");
    } finally {
      setDeletingTrip(false);
    }
  }

  async function uploadCover(file?: File | null) {
    if (!tripId || !token || !file) return;

    try {
      setUploadingCover(true);
      setErr(null);

      const form = new FormData();
      form.append("cover", file);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/cover`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          tripErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to upload trip cover");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function addMember() {
    if (!tripId || !token || !selectedUser) return;

    try {
      setAddingMember(true);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/members`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            role: newMemberRole,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          memberErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setMemberQuery("");
      setSelectedUser(null);
      setMemberResults([]);
      setNewMemberRole("MEMBER");
      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  }

  async function updateMemberRole(memberId: string, role: TripRole) {
    if (!tripId || !token) return;

    try {
      setMemberBusyId(memberId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          memberErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update member");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function removeMember(memberId: string) {
    if (!tripId || !token) return;
    if (!window.confirm("Remove this member from the trip?")) return;

    try {
      setMemberBusyId(memberId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          memberErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to remove member");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function saveEdit(itemId: string) {
    if (!tripId || !token || !editDraft) return;

    if (!editDraft.type || !editDraft.title.trim() || !editDraft.date) {
      setErr("Type, title, and date are required.");
      return;
    }

    try {
      setSavingItemId(itemId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: editDraft.type,
            title: editDraft.title.trim(),
            date: editDraft.date,
            endDate: optionalText(editDraft.endDate),
            startTime: optionalText(editDraft.startTime),
            provider: optionalText(editDraft.provider),
            notes: optionalText(editDraft.notes),
            directPrice: optionalNumber(editDraft.directPrice),
            providerPrice: optionalNumber(editDraft.providerPrice),
            currency: optionalText(editDraft.currency),
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          errorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setEditingItemId(null);
      setEditDraft(null);
      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save trip item");
    } finally {
      setSavingItemId(null);
    }
  }

  async function deleteItem(itemId: string) {
    if (!tripId || !token) return;
    if (!window.confirm("Delete this trip item?")) return;

    try {
      setDeletingItemId(itemId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          errorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      if (editingItemId === itemId) {
        setEditingItemId(null);
        setEditDraft(null);
      }

      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete trip item");
    } finally {
      setDeletingItemId(null);
    }
  }

  async function moveItem(itemId: string, direction: "up" | "down") {
    if (!tripId || !token) return;

    try {
      setMovingItemId(itemId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}/move`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ direction }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          errorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to move trip item");
    } finally {
      setMovingItemId(null);
    }
  }

  const groupedItems = useMemo(() => {
    const groups = new Map<string, TripItem[]>();

    for (const item of trip?.items ?? []) {
      const key = dateKey(item);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return Array.from(groups.entries());
  }, [trip?.items]);

  const mapMarkers = useMemo<TripMapMarker[]>(() => {
    return (trip?.items ?? [])
      .map((item): TripMapMarker | null => {
        const itemType = String(item.type ?? "").toLowerCase();
        const lat = toFiniteNumber(item.course?.lat ?? item.lat ?? item.latitude);
        const lon = toFiniteNumber(item.course?.lon ?? item.lon ?? item.longitude);
        const courseId = item.course?.id ?? item.courseId;
        const courseName = item.course?.name?.trim() || "";

        if (
          lat == null ||
          lon == null ||
          lat < -90 ||
          lat > 90 ||
          lon < -180 ||
          lon > 180
        ) {
          return null;
        }

        return {
          id: item.id,
          number: 0,
          title:
            item.title ||
            courseName ||
            item.locationName ||
            itemTypeLabel(item.type),
          typeLabel: itemTypeLabel(item.type),
          typeKey: itemType || "note",
          dateLabel: formatDateLabel(dateKey(item)),
          startTime: formatTime(item),
          timeLabel: formatTimeRange(item),
          courseId,
          courseName: courseName || null,
          locationName: item.locationName?.trim() || null,
          address: item.address?.trim() || null,
          lat,
          lon,
        };
      })
      .filter((marker): marker is TripMapMarker => marker !== null)
      .map((marker, index) => ({
        ...marker,
        number: index + 1,
      }));
  }, [trip?.items]);

  const summaryStats = useMemo<TripSummaryStat[]>(() => {
    const items = trip?.items ?? [];
    const dateTimes: number[] = [];
    let golfRounds = 0;
    let hotels = 0;
    let transfers = 0;

    for (const item of items) {
      const itemType = String(item.type ?? "").toLowerCase();
      if (itemType === "golf_round" || itemType === "course") golfRounds += 1;
      if (itemType === "hotel") hotels += 1;
      if (itemType === "transfer") transfers += 1;

      for (const value of [itemDateValue(item), item.endDate]) {
        if (!value) continue;
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          const day = new Date(
            Date.UTC(
              date.getUTCFullYear(),
              date.getUTCMonth(),
              date.getUTCDate(),
            ),
          );
          dateTimes.push(day.getTime());
        }
      }
    }

    const tripDays =
      dateTimes.length === 0
        ? 0
        : Math.max(
            1,
            Math.round(
              (Math.max(...dateTimes) - Math.min(...dateTimes)) / 86400000,
            ) + 1,
          );

    return [
      { label: "Members", value: trip?.members?.length ?? 0 },
      { label: "Golf rounds", value: golfRounds },
      { label: "Hotels", value: hotels },
      { label: "Transfers", value: transfers },
      { label: "Trip days", value: tripDays },
    ];
  }, [trip?.items, trip?.members]);

  const budgetSummary = useMemo<BudgetSummary>(() => {
    const categories: Record<BudgetCategory, number> = {
      Golf: 0,
      Hotel: 0,
      Transfer: 0,
      Activity: 0,
      Other: 0,
    };
    const currencies = new Set<string>();
    let directTotal = 0;
    let providerTotal = 0;
    let caddyTotal = 0;
    let cartTotal = 0;

    for (const item of trip?.items ?? []) {
      const direct = typeof item.directPrice === "number" && Number.isFinite(item.directPrice) ? item.directPrice : 0;
      const provider =
        typeof item.providerPrice === "number" && Number.isFinite(item.providerPrice)
          ? item.providerPrice
          : 0;
      const caddy = typeof item.caddyFee === "number" && Number.isFinite(item.caddyFee) ? item.caddyFee : 0;
      const cart = typeof item.cartFee === "number" && Number.isFinite(item.cartFee) ? item.cartFee : 0;
      const itemTotal = direct + provider + caddy + cart;

      if (itemTotal > 0) {
        currencies.add(item.currency?.trim() || "CHF");
      }

      directTotal += direct;
      providerTotal += provider;
      caddyTotal += caddy;
      cartTotal += cart;
      categories[budgetCategory(item.type)] += itemTotal;
    }

    const total = directTotal + providerTotal + caddyTotal + cartTotal;
    const people = trip?.members?.length ?? 0;
    const currency = Array.from(currencies)[0] || "CHF";

    return {
      mixedCurrencies: currencies.size > 1,
      currency,
      total,
      perPerson: people > 0 ? total / people : total,
      directTotal,
      providerTotal,
      caddyTotal,
      cartTotal,
      categories,
    };
  }, [trip?.items, trip?.members]);

  const memberCount = trip?.members?.length ?? 0;
  const itemCount = trip?.items?.length ?? 0;
  const budgetCards = [
    { label: "Total budget", value: budgetSummary.total },
    { label: "Golf cost", value: budgetSummary.categories.Golf },
    { label: "Hotel cost", value: budgetSummary.categories.Hotel },
    { label: "Transport cost", value: budgetSummary.categories.Transfer },
    { label: "Estimated per person", value: budgetSummary.perPerson },
  ];
  const budgetFieldTotals = [
    { label: "Direct", value: budgetSummary.directTotal },
    { label: "Provider", value: budgetSummary.providerTotal },
    { label: "Caddy", value: budgetSummary.caddyTotal },
    { label: "Cart", value: budgetSummary.cartTotal },
  ];
  const budgetCategoryTotals: { label: BudgetCategory; value: number }[] = [
    { label: "Golf", value: budgetSummary.categories.Golf },
    { label: "Hotel", value: budgetSummary.categories.Hotel },
    { label: "Transfer", value: budgetSummary.categories.Transfer },
    { label: "Activity", value: budgetSummary.categories.Activity },
    { label: "Other", value: budgetSummary.categories.Other },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        boxSizing: "border-box",
        overflowX: "hidden",
        padding: "16px 16px calc(96px + env(safe-area-inset-bottom, 0px))",
        display: "grid",
        gap: 16,
      }}
    >
      <section
        style={{
          ...safeSectionStyle,
          overflow: "hidden",
          display: "grid",
          gap: 14,
          padding: 14,
          borderRadius: 14,
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={() => nav("/trips")}
          style={{
            width: "fit-content",
            height: 32,
            padding: "0 12px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--sub)",
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          Back to Trips
        </button>

        {trip?.coverImageUrl ? (
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              aspectRatio: "16 / 9",
              maxHeight: 340,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <img
              src={fileUrl(trip.coverImageUrl)}
              alt={trip.title ? `${trip.title} cover` : "Trip cover"}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover",
              }}
            />
          </div>
        ) : null}

        <div
          style={{
            ...safeSectionStyle,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              minWidth: 0,
              width: "100%",
              maxWidth: "100%",
              display: "grid",
              gap: 6,
              flex: "1 1 240px",
            }}
          >
            {editingTrip && tripDraft ? (
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  value={tripDraft.title}
                  onChange={(e) =>
                    setTripDraft({ ...tripDraft, title: e.target.value })
                  }
                  placeholder="Trip title"
                  style={editFieldStyle}
                />
                <input
                  value={tripDraft.destination}
                  onChange={(e) =>
                    setTripDraft({
                      ...tripDraft,
                      destination: e.target.value,
                    })
                  }
                  placeholder="Destination"
                  style={editFieldStyle}
                />
                <textarea
                  value={tripDraft.description}
                  onChange={(e) =>
                    setTripDraft({
                      ...tripDraft,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description"
                  rows={3}
                  style={{ ...editFieldStyle, resize: "vertical" }}
                />
                <div style={wrappingActionRowStyle}>
                  <button
                    type="button"
                    onClick={saveTripEdit}
                    disabled={savingTrip}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "var(--text)",
                      color: "var(--bg)",
                      cursor: savingTrip ? "default" : "pointer",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {savingTrip ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTrip(false);
                      setTripDraft(null);
                    }}
                    disabled={savingTrip}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--sub)",
                      cursor: savingTrip ? "default" : "pointer",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 22,
                    lineHeight: 1.15,
                    fontWeight: 950,
                    color: "var(--text)",
                  }}
                >
                  {trip?.title ?? "Trip"}
                </div>

                {trip?.destination ? (
                  <div style={{ fontSize: 14, color: "var(--sub)" }}>
                    {trip.destination}
                  </div>
                ) : null}

                {trip?.description ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text)",
                      lineHeight: 1.45,
                    }}
                  >
                    {trip.description}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    color: "var(--sub)",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  <span>{memberCount} members</span>
                  <span>{itemCount} items</span>
                </div>
              </>
            )}
          </div>

          {canEditTrip ? (
            <div style={wrappingActionRowStyle}>
              {!editingTrip ? (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadCover(e.target.files?.[0])}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={!trip || deletingTrip || uploadingCover}
                  style={{
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--sub)",
                    cursor:
                      !trip || deletingTrip || uploadingCover
                        ? "default"
                        : "pointer",
                    fontWeight: 900,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {uploadingCover ? "Uploading..." : "Upload Cover"}
                </button>
                <button
                  type="button"
                  onClick={startTripEdit}
                  disabled={!trip || deletingTrip}
                  style={{
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--sub)",
                    cursor: !trip || deletingTrip ? "default" : "pointer",
                    fontWeight: 900,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  Edit Trip
                </button>
                <button
                  type="button"
                  onClick={deleteTrip}
                  disabled={!trip || deletingTrip}
                  style={{
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--sub)",
                    cursor: !trip || deletingTrip ? "default" : "pointer",
                    fontWeight: 900,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {deletingTrip ? "Deleting..." : "Delete Trip"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (tripId) nav(`/trips/${tripId}/add-item`);
              }}
              disabled={editingTrip || deletingTrip}
              style={{
                height: 38,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--text)",
                color: "var(--bg)",
                cursor: editingTrip || deletingTrip ? "default" : "pointer",
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              + Add Item
            </button>
            </div>
          ) : null}
        </div>
      </section>

      <section
        style={{
          ...safeSectionStyle,
          display: "grid",
          gap: 10,
          padding: 12,
          borderRadius: 14,
          background: "var(--card)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            ...safeSectionStyle,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text)" }}>
              Budget Summary
            </div>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>
              Estimated costs from timeline item pricing
            </div>
          </div>
          {budgetSummary.mixedCurrencies ? (
            <div
              style={{
                borderRadius: 999,
                border: "1px solid var(--border)",
                color: "var(--sub)",
                fontSize: 11,
                fontWeight: 900,
                padding: "5px 8px",
                whiteSpace: "nowrap",
              }}
            >
              Mixed currencies
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
            gap: 8,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          {budgetCards.map((card) => (
            <div
              key={card.label}
              style={{
                minWidth: 0,
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                display: "grid",
                gap: 4,
              }}
            >
              <div
                style={{
                  color: "var(--text)",
                  fontSize: budgetSummary.mixedCurrencies && card.value > 0 ? 13 : 18,
                  lineHeight: 1.15,
                  fontWeight: 950,
                  overflowWrap: "anywhere",
                }}
              >
                {budgetAmount(card.value, budgetSummary)}
              </div>
              <div
                style={{
                  color: "var(--sub)",
                  fontSize: 11,
                  fontWeight: 900,
                  overflowWrap: "anywhere",
                }}
              >
                {card.label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            ...safeSectionStyle,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 8,
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "grid",
              gap: 7,
              padding: 10,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
              Cost Sources
            </div>
            {budgetFieldTotals.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  color: "var(--sub)",
                  fontSize: 12,
                  fontWeight: 850,
                }}
              >
                <span>{row.label}</span>
                <span style={{ color: "var(--text)", textAlign: "right" }}>
                  {budgetAmount(row.value, budgetSummary)}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              minWidth: 0,
              display: "grid",
              gap: 7,
              padding: 10,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
              Category Breakdown
            </div>
            {budgetCategoryTotals.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  color: "var(--sub)",
                  fontSize: 12,
                  fontWeight: 850,
                }}
              >
                <span>{row.label}</span>
                <span style={{ color: "var(--text)", textAlign: "right" }}>
                  {budgetAmount(row.value, budgetSummary)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          ...safeSectionStyle,
          display: "grid",
          gap: 10,
          padding: 12,
          borderRadius: 14,
          background: "var(--card)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text)" }}>
            Trip Summary
          </div>
          <div style={{ fontSize: 12, color: "var(--sub)" }}>
            Key trip counts from the timeline
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
            gap: 8,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              style={{
                minWidth: 0,
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                display: "grid",
                gap: 3,
              }}
            >
              <div
                style={{
                  color: "var(--text)",
                  fontSize: 20,
                  lineHeight: 1,
                  fontWeight: 950,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  color: "var(--sub)",
                  fontSize: 11,
                  fontWeight: 900,
                  overflowWrap: "anywhere",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          ...safeSectionStyle,
          overflow: "hidden",
          display: "grid",
          gap: 12,
          padding: 14,
          borderRadius: 14,
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            ...safeSectionStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 180px" }}>
            <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text)" }}>
              Members
            </div>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>
              People who can view this trip
            </div>
          </div>
          {canEditTrip ? (
            <div
              style={{
                color: "var(--sub)",
                fontSize: 12,
                fontWeight: 900,
                flex: "0 1 auto",
              }}
            >
              Admin tools
            </div>
          ) : null}
        </div>

        {canEditTrip ? (
          <div style={{ ...safeSectionStyle, display: "grid", gap: 8 }}>
            <div
              style={{
                ...safeSectionStyle,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <input
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  setSelectedUser(null);
                }}
                placeholder="Search Fairwayd user"
                style={{ ...editFieldStyle, flex: "1 1 180px", minWidth: 0 }}
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as TripRole)}
                style={{
                  ...editFieldStyle,
                  flex: "1 0 104px",
                  minWidth: 104,
                }}
              >
                {memberRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {selectedUser ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  fontSize: 13,
                  boxSizing: "border-box",
                  maxWidth: "100%",
                }}
              >
                <span
                  style={{
                    color: "var(--text)",
                    fontWeight: 900,
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    flex: "1 1 160px",
                  }}
                >
                  Selected: {displayUserName(selectedUser)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setMemberQuery("");
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--sub)",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  Clear
                </button>
              </div>
            ) : null}

            {memberResults.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  padding: 6,
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  boxSizing: "border-box",
                  maxWidth: "100%",
                }}
              >
                {memberResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(result);
                      setMemberQuery(displayUserName(result));
                      setMemberResults([]);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 8px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      cursor: "pointer",
                      textAlign: "left",
                      minWidth: 0,
                      boxSizing: "border-box",
                      maxWidth: "100%",
                    }}
                  >
                    <MemberAvatar user={result} />
                    <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                      <div style={{ fontWeight: 900 }}>
                        {displayUserName(result)}
                      </div>
                      {result.handle ? (
                        <div style={{ color: "var(--sub)", fontSize: 12 }}>
                          @{result.handle}
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={addMember}
              disabled={!selectedUser || addingMember}
              style={{
                width: "fit-content",
                height: 32,
                padding: "0 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--text)",
                color: "var(--bg)",
                cursor: !selectedUser || addingMember ? "default" : "pointer",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              {addingMember ? "Adding..." : "Add Member"}
            </button>
          </div>
        ) : null}

        <div style={{ ...safeSectionStyle, display: "grid", gap: 8 }}>
          {(trip?.members ?? []).map((member) => {
            const memberUser = member.user;
            return (
              <div
                key={member.id}
                style={{
                  ...safeSectionStyle,
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: "7px 8px",
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <MemberAvatar user={memberUser} />
                <div
                  style={{
                    minWidth: 0,
                    flex: "1 1 130px",
                    overflowWrap: "anywhere",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text)",
                      fontWeight: 900,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {displayUserName(memberUser)}
                  </div>
                  {memberUser?.handle ? (
                    <div style={{ color: "var(--sub)", fontSize: 12 }}>
                      @{memberUser.handle}
                    </div>
                  ) : null}
                </div>

                {canEditTrip ? (
                  <select
                    value={member.role}
                    disabled={memberBusyId === member.id}
                    onChange={(e) =>
                      updateMemberRole(member.id, e.target.value as TripRole)
                    }
                    style={{
                      ...editFieldStyle,
                      width: "auto",
                      flex: "0 1 96px",
                      padding: "7px 8px",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {memberRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      padding: "5px 8px",
                      color: "var(--sub)",
                      fontSize: 11,
                      fontWeight: 900,
                      maxWidth: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {member.role}
                  </span>
                )}

                {canEditTrip ? (
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    disabled={memberBusyId === member.id}
                    style={{
                      height: 30,
                      padding: "0 10px",
                      flexShrink: 0,
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--sub)",
                      cursor:
                        memberBusyId === member.id ? "default" : "pointer",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {memberBusyId === member.id ? "..." : "Remove"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

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

      <div
        style={{
          display: "inline-flex",
          width: "fit-content",
          maxWidth: "100%",
          padding: 4,
          borderRadius: 999,
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        {(["timeline", "map"] as TripView[]).map((view) => {
          const active = activeView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              style={{
                height: 32,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid transparent",
                background: active ? "var(--text)" : "transparent",
                color: active ? "var(--bg)" : "var(--sub)",
                cursor: "pointer",
                fontWeight: 950,
                fontSize: 12,
              }}
            >
              {view === "timeline" ? "Timeline" : "Map"}
            </button>
          );
        })}
      </div>

      {activeView === "timeline" ? (
      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text)" }}>
            Trip Timeline
          </div>
          <div style={{ fontSize: 13, color: "var(--sub)" }}>
            Rounds, stays, transfers, and notes for this trip
          </div>
        </div>

        {!loading && !err && trip && groupedItems.length === 0 ? (
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: 16,
              borderRadius: 14,
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ color: "var(--text)", fontWeight: 950 }}>
              No timeline items yet
            </div>
            <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
              {canEditTrip
                ? "Add the first round, hotel, transfer, or note to start building this trip."
                : "Trip admins have not added timeline items yet."}
            </div>
            {canEditTrip ? (
              <button
                type="button"
                onClick={() => {
                  if (tripId) nav(`/trips/${tripId}/add-item`);
                }}
                style={{
                  width: "fit-content",
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                + Add first item
              </button>
            ) : null}
          </div>
        ) : null}

        {groupedItems.map(([key, items]) => (
          <section
            key={key}
            style={{
              display: "grid",
              gap: 10,
              padding: "12px 0 2px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 950,
                padding: "0 2px",
              }}
            >
              {formatDateLabel(key)}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {items.map((item, itemIndex) => {
                const prices = pricingParts(item);
                const time = formatTimeRange(item);
                const dateRange = formatDateRange(item);
                const details = timelineDetails(item);
                const courseId = item.course?.id ?? item.courseId;
                const courseName = item.course?.name;
                const itemType = String(item.type ?? "").toLowerCase();
                const typeLabel = itemTypeLabel(item.type);
                const isGolf =
                  itemType === "golf_round" || itemType === "course";
                const canOpenCourse = isGolf && !!courseId;
                const isEditing = editingItemId === item.id && !!editDraft;
                const isMoving = movingItemId === item.id;
                const canMoveUp =
                  canEditTrip && itemIndex > 0 && !isMoving;
                const canMoveDown =
                  canEditTrip &&
                  itemIndex < items.length - 1 &&
                  !isMoving;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "24px minmax(0, 1fr)",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        justifyItems: "center",
                        alignContent: "start",
                        gap: 6,
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: "3px solid var(--card)",
                          background: "var(--text)",
                          boxShadow: "0 0 0 1px var(--border)",
                          marginTop: 15,
                        }}
                      />
                      <div
                        aria-hidden="true"
                        style={{
                          width: 1,
                          minHeight: 72,
                          background: "var(--border)",
                        }}
                      />
                    </div>

                    <article
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        display: "grid",
                        gap: 9,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        <div
                          aria-hidden="true"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            display: "grid",
                            placeItems: "center",
                            background: "var(--bg)",
                            flexShrink: 0,
                          }}
                        >
                          {itemIcon(item.type)}
                        </div>

                        <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: 999,
                                padding: "3px 8px",
                                background: "var(--bg)",
                                color: "var(--sub)",
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                            >
                              {typeLabel}
                            </span>
                            {isGolf && courseName ? (
                              <span
                                style={{
                                  border: "1px solid var(--border)",
                                  borderRadius: 999,
                                  padding: "3px 8px",
                                  background: "var(--bg)",
                                  color: "var(--text)",
                                  fontSize: 11,
                                  fontWeight: 950,
                                }}
                              >
                                Linked course
                              </span>
                            ) : null}
                          </div>

                          <div
                            style={{
                              fontWeight: 950,
                              color: "var(--text)",
                              lineHeight: 1.25,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.title || "Untitled item"}
                          </div>

                          {courseName ? (
                            <div
                              style={{
                                color: "var(--sub)",
                                fontSize: 13,
                                fontWeight: isGolf ? 900 : 700,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {isGolf ? `Course: ${courseName}` : courseName}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {isEditing ? (
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            paddingTop: 2,
                          }}
                        >
                          {courseName ? (
                            <div
                              style={{
                                color: "var(--sub)",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              Course stays linked: {courseName}
                            </div>
                          ) : null}

                          <select
                            value={editDraft.type}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                type: e.target.value,
                              })
                            }
                            style={editFieldStyle}
                          >
                            {itemTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <input
                            value={editDraft.title}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                title: e.target.value,
                              })
                            }
                            placeholder="Title"
                            style={editFieldStyle}
                          />

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(140px, 1fr))",
                              gap: 8,
                            }}
                          >
                            <input
                              type="date"
                              value={editDraft.date}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  date: e.target.value,
                                })
                              }
                              style={editFieldStyle}
                            />
                            <input
                              type="date"
                              value={editDraft.endDate}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  endDate: e.target.value,
                                })
                              }
                              style={editFieldStyle}
                            />
                            <input
                              type="time"
                              value={editDraft.startTime}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  startTime: e.target.value,
                                })
                              }
                              style={editFieldStyle}
                            />
                          </div>

                          <input
                            value={editDraft.provider}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                provider: e.target.value,
                              })
                            }
                            placeholder="Provider"
                            style={editFieldStyle}
                          />

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "minmax(0, 1fr) minmax(0, 1fr)",
                              gap: 8,
                            }}
                          >
                            <input
                              type="number"
                              inputMode="decimal"
                              value={editDraft.directPrice}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  directPrice: e.target.value,
                                })
                              }
                              placeholder="Direct price"
                              style={editFieldStyle}
                            />
                            <input
                              type="number"
                              inputMode="decimal"
                              value={editDraft.providerPrice}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  providerPrice: e.target.value,
                                })
                              }
                              placeholder="Provider price"
                              style={editFieldStyle}
                            />
                          </div>

                          <input
                            value={editDraft.currency}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                currency: e.target.value,
                              })
                            }
                            placeholder="Currency"
                            style={editFieldStyle}
                          />

                          <textarea
                            value={editDraft.notes}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                notes: e.target.value,
                              })
                            }
                            placeholder="Notes"
                            rows={4}
                            style={{ ...editFieldStyle, resize: "vertical" }}
                          />

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => saveEdit(item.id)}
                              disabled={savingItemId === item.id}
                              style={{
                                height: 30,
                                padding: "0 12px",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                background: "var(--text)",
                                color: "var(--bg)",
                                cursor:
                                  savingItemId === item.id
                                    ? "default"
                                    : "pointer",
                                fontWeight: 900,
                                fontSize: 12,
                              }}
                            >
                              {savingItemId === item.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(null);
                                setEditDraft(null);
                              }}
                              disabled={savingItemId === item.id}
                              style={{
                                height: 30,
                                padding: "0 12px",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                background: "transparent",
                                color: "var(--sub)",
                                cursor:
                                  savingItemId === item.id
                                    ? "default"
                                    : "pointer",
                                fontWeight: 900,
                                fontSize: 12,
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "grid",
                              gap: 7,
                              padding: "8px 10px",
                              borderRadius: 12,
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                color: "var(--text)",
                                fontSize: 12,
                                fontWeight: 950,
                              }}
                            >
                              <span>{dateRange || formatDateLabel(dateKey(item))}</span>
                              {time ? <span>{time}</span> : null}
                            </div>

                            {details.length > 0 ? (
                              <div style={{ display: "grid", gap: 5 }}>
                                {details.map((detail) => (
                                  <div
                                    key={`${detail.label}-${detail.value}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "72px minmax(0, 1fr)",
                                      gap: 8,
                                      color: "var(--sub)",
                                      fontSize: 12,
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    <span style={{ fontWeight: 900 }}>
                                      {detail.label}
                                    </span>
                                    <span
                                      style={{
                                        color: "var(--text)",
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {detail.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {prices.length > 0 ? (
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
                                {prices.map((price) => (
                                  <span key={price}>{price}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {item.notes ? (
                            <div
                              style={{
                                color: "var(--text)",
                                fontSize: 13,
                                lineHeight: 1.45,
                              }}
                            >
                              {item.notes}
                            </div>
                          ) : null}

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            {canEditTrip ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => moveItem(item.id, "up")}
                                  disabled={!canMoveUp}
                                  style={{
                                    height: 30,
                                    padding: "0 9px",
                                    borderRadius: 999,
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--sub)",
                                    cursor: canMoveUp ? "pointer" : "default",
                                    opacity: canMoveUp ? 1 : 0.45,
                                    fontWeight: 900,
                                    fontSize: 12,
                                  }}
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItem(item.id, "down")}
                                  disabled={!canMoveDown}
                                  style={{
                                    height: 30,
                                    padding: "0 9px",
                                    borderRadius: 999,
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--sub)",
                                    cursor: canMoveDown ? "pointer" : "default",
                                    opacity: canMoveDown ? 1 : 0.45,
                                    fontWeight: 900,
                                    fontSize: 12,
                                  }}
                                >
                                  Down
                                </button>
                              </>
                            ) : null}
                            {canOpenCourse ? (
                              <button
                                type="button"
                                onClick={() => nav(`/courses/${courseId}`)}
                                style={{
                                  width: "fit-content",
                                  height: 30,
                                  padding: "0 10px",
                                  borderRadius: 999,
                                  border: "1px solid var(--border)",
                                  background: "transparent",
                                  color: "var(--sub)",
                                  cursor: "pointer",
                                  fontWeight: 900,
                                  fontSize: 12,
                                }}
                              >
                                Open course
                              </button>
                            ) : null}
                            {canEditTrip ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  disabled={deletingItemId === item.id}
                                  style={{
                                    height: 30,
                                    padding: "0 10px",
                                    borderRadius: 999,
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--sub)",
                                    cursor:
                                      deletingItemId === item.id
                                        ? "default"
                                        : "pointer",
                                    fontWeight: 900,
                                    fontSize: 12,
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteItem(item.id)}
                                  disabled={deletingItemId === item.id}
                                  style={{
                                    height: 30,
                                    padding: "0 10px",
                                    borderRadius: 999,
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--sub)",
                                    cursor:
                                      deletingItemId === item.id
                                        ? "default"
                                        : "pointer",
                                    fontWeight: 900,
                                    fontSize: 12,
                                  }}
                                >
                                  {deletingItemId === item.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </>
                      )}
                    </article>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </section>
      ) : (
        <TripMapView
          markers={mapMarkers}
          onOpenCourse={(courseId) => nav(`/courses/${courseId}`)}
        />
      )}
    </div>
  );
}
