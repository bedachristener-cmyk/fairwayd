import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { useAuth } from "../auth/AuthContext";

type InvitePreview = {
  token: string;
  trip: {
    id: string;
    title: string;
    destination?: string | null;
    coverImageUrl?: string | null;
    memberCount: number;
    itemCount: number;
  };
};

export default function TripInvitePage() {
  const { token: inviteToken } = useParams();
  const nav = useNavigate();
  const { token, loading: authLoading, isAuthenticated } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const coverUrl = useMemo(
    () => fileUrl(preview?.trip.coverImageUrl),
    [preview?.trip.coverImageUrl],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!inviteToken) return;

      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(
          `${API_BASE}/trips/invite/${encodeURIComponent(inviteToken)}`,
        );

        if (!res.ok) {
          throw new Error("Invite link is invalid or no longer active.");
        }

        const data = await res.json();
        if (!cancelled) setPreview(data);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Could not load invite.");
          setPreview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  async function joinTrip() {
    if (!inviteToken || !token) {
      nav(`/?next=${encodeURIComponent(`/trips/invite/${inviteToken ?? ""}`)}`);
      return;
    }

    try {
      setJoining(true);
      setErr(null);
      const res = await fetch(
        `${API_BASE}/trips/invite/${encodeURIComponent(inviteToken)}/join`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        throw new Error("Could not join this trip.");
      }

      const data = await res.json();
      nav(`/trips/${data.tripId}`);
    } catch (e: any) {
      setErr(e?.message ?? "Could not join this trip.");
    } finally {
      setJoining(false);
    }
  }

  const loginNext = `/trips/invite/${inviteToken ?? ""}`;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        margin: "0 auto",
        padding: "16px 14px calc(96px + env(safe-area-inset-bottom, 0px))",
        boxSizing: "border-box",
        display: "grid",
        gap: 14,
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
          fontWeight: 850,
          fontSize: 12,
        }}
      >
        Back to trips
      </button>

      <section
        style={{
          borderRadius: 22,
          border: "1px solid var(--border)",
          background: "var(--card)",
          overflow: "hidden",
          boxShadow: "0 14px 38px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            height: 170,
            background: "linear-gradient(135deg, var(--green), var(--muted))",
            overflow: "hidden",
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
                display: "block",
              }}
            />
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 12, padding: 16 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ color: "var(--sub)", fontSize: 12, fontWeight: 800 }}>
              Trip invite
            </div>
            <div
              style={{
                color: "var(--text)",
                fontSize: 22,
                lineHeight: 1.15,
                fontWeight: 950,
                overflowWrap: "anywhere",
              }}
            >
              {loading ? "Loading trip..." : preview?.trip.title ?? "Trip invite"}
            </div>
            {preview?.trip.destination ? (
              <div style={{ color: "var(--sub)", fontSize: 13 }}>
                {preview.trip.destination}
              </div>
            ) : null}
          </div>

          {preview ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                color: "var(--sub)",
                fontSize: 12,
                fontWeight: 750,
              }}
            >
              <span>{preview.trip.memberCount} members</span>
              <span>{preview.trip.itemCount} items</span>
            </div>
          ) : null}

          {err ? (
            <div
              style={{
                padding: 11,
                borderRadius: 14,
                background: "var(--danger-soft)",
                color: "var(--danger)",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.35,
              }}
            >
              {err}
            </div>
          ) : null}

          {!authLoading && preview ? (
            isAuthenticated ? (
              <button
                type="button"
                onClick={joinTrip}
                disabled={joining}
                style={{
                  height: 40,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  cursor: joining ? "default" : "pointer",
                  fontWeight: 900,
                }}
              >
                {joining ? "Joining..." : "Join trip"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => nav(`/?next=${encodeURIComponent(loginNext)}`)}
                style={{
                  height: 40,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Sign in to join
              </button>
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}
