import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { fileUrl } from "../api/fileUrl";

type TripItem = {
  id: string;
  type?: string | null;
  title?: string | null;
  notes?: string | null;
  date?: string | null;
  startsAt?: string | null;
  startTime?: string | null;
  provider?: string | null;
  directPrice?: number | null;
  caddyFee?: number | null;
  cartFee?: number | null;
  providerPrice?: number | null;
  currency?: string | null;
  courseId?: string | null;
  course?: {
    id: string;
    name?: string | null;
  } | null;
};

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
  description?: string | null;
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
  startTime: string;
  provider: string;
  notes: string;
  directPrice: string;
  providerPrice: string;
  currency: string;
};

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
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  padding: "9px 10px",
  font: "inherit",
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

function MemberAvatar({ user }: { user?: UserSearchResult | null }) {
  const label = displayUserName(user);

  if (user?.avatarUrl) {
    return (
      <img
        src={fileUrl(user.avatarUrl)}
        alt={label}
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          objectFit: "cover",
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
        width: 34,
        height: 34,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        fontWeight: 950,
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
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState(false);
  const [tripDraft, setTripDraft] = useState<TripEditDraft | null>(null);
  const [savingTrip, setSavingTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [newMemberRole, setNewMemberRole] = useState<TripRole>("MEMBER");
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  const myMembership = trip?.members?.find((member) => member.userId === user?.id);
  const canManageMembers =
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
      if (!token || !canManageMembers) {
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
  }, [canManageMembers, memberQuery, selectedUser, token, trip?.members]);

  function startEdit(item: TripItem) {
    setErr(null);
    setEditingItemId(item.id);
    setEditDraft({
      type: item.type || "note",
      title: item.title || "",
      date: dateInputValue(item),
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

  const groupedItems = useMemo(() => {
    const groups = new Map<string, TripItem[]>();

    for (const item of trip?.items ?? []) {
      const key = dateKey(item);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return Array.from(groups.entries());
  }, [trip?.items]);

  const memberCount = trip?.members?.length ?? 0;
  const itemCount = trip?.items?.length ?? 0;

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <section
        style={{
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

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, display: "grid", gap: 6, flex: 1 }}>
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {!editingTrip ? (
              <>
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
        </div>
      </section>

      <section
        style={{
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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text)" }}>
              Members
            </div>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>
              People who can view this trip
            </div>
          </div>
          {canManageMembers ? (
            <div
              style={{
                color: "var(--sub)",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              Admin tools
            </div>
          ) : null}
        </div>

        {canManageMembers ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 104px",
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
                style={editFieldStyle}
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as TripRole)}
                style={editFieldStyle}
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
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--text)", fontWeight: 900 }}>
                  Selected: {displayUserName(selectedUser)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setMemberQuery("");
                  }}
                  style={{
                    marginLeft: "auto",
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
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <MemberAvatar user={result} />
                    <div style={{ minWidth: 0 }}>
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

        <div style={{ display: "grid", gap: 8 }}>
          {(trip?.members ?? []).map((member) => {
            const memberUser = member.user;
            return (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <MemberAvatar user={memberUser} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: "var(--text)", fontWeight: 900 }}>
                    {displayUserName(memberUser)}
                  </div>
                  {memberUser?.handle ? (
                    <div style={{ color: "var(--sub)", fontSize: 12 }}>
                      @{memberUser.handle}
                    </div>
                  ) : null}
                </div>

                {canManageMembers ? (
                  <select
                    value={member.role}
                    disabled={memberBusyId === member.id}
                    onChange={(e) =>
                      updateMemberRole(member.id, e.target.value as TripRole)
                    }
                    style={{
                      ...editFieldStyle,
                      width: 96,
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
                    }}
                  >
                    {member.role}
                  </span>
                )}

                {canManageMembers ? (
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    disabled={memberBusyId === member.id}
                    style={{
                      height: 30,
                      padding: "0 10px",
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
              padding: 14,
              borderRadius: 12,
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--sub)",
              fontSize: 13,
            }}
          >
            No timeline items yet
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
              {items.map((item) => {
                const prices = pricingParts(item);
                const time = formatTime(item);
                const courseId = item.course?.id ?? item.courseId;
                const courseName = item.course?.name;
                const itemType = String(item.type ?? "").toLowerCase();
                const isGolf =
                  itemType === "golf_round" || itemType === "course";
                const canOpenCourse = isGolf && !!courseId;
                const isEditing = editingItemId === item.id && !!editDraft;

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
                              fontWeight: 950,
                              color: "var(--text)",
                              lineHeight: 1.25,
                            }}
                          >
                            {item.title || "Untitled item"}
                          </div>

                          {courseName ? (
                            <div style={{ color: "var(--sub)", fontSize: 13 }}>
                              {courseName}
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
                                "minmax(0, 1fr) minmax(0, 1fr)",
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
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              color: "var(--sub)",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {time ? <span>{time}</span> : null}
                            {item.provider ? <span>{item.provider}</span> : null}
                            {prices.map((price) => (
                              <span key={price}>{price}</span>
                            ))}
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
    </div>
  );
}
