import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  acceptFollowRequest,
  fetchFollowRequests,
  rejectFollowRequest,
  type FollowRequestItem,
} from "../api/followRequests";
import { fileUrl } from "../api/fileUrl";

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>{title}</div>
        {right}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function Avatar({ url, handle }: { url?: string | null; handle: string }) {
  const letter = (handle?.[0] ?? "?").toUpperCase();
  if (url) {
    return (
      <img
        src={fileUrl(url)}
        alt={handle}
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          objectFit: "cover",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "rgba(39,196,107,0.14)",
        color: "#0b6b3a",
        fontWeight: 900,
        border: "1px solid rgba(39,196,107,0.25)",
      }}
    >
      {letter}
    </div>
  );
}

export default function FollowRequestsPage() {
  const { token } = useAuth() as any;
  const [items, setItems] = useState<FollowRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchFollowRequests(token);
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
          ? (data as any).items
          : [];
      setItems(list);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(() => items.length, [items]);

  const onAccept = useCallback(
    async (followerId: string) => {
      setBusyId(followerId);
      setErr(null);
      try {
        await acceptFollowRequest(token, followerId);
        setItems((prev) => prev.filter((x) => x.followerId !== followerId));
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        setBusyId(null);
      }
    },
    [token],
  );

  const onReject = useCallback(
    async (followerId: string) => {
      setBusyId(followerId);
      setErr(null);
      try {
        await rejectFollowRequest(token, followerId);
        setItems((prev) => prev.filter((x) => x.followerId !== followerId));
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        setBusyId(null);
      }
    },
    [token],
  );

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "end", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.3 }}>
            Follow Requests
          </div>
          <div style={{ marginTop: 6, opacity: 0.7 }}>{pendingCount} offen</div>
        </div>
        <button
          onClick={load}
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {err ? (
          <div
            style={{
              background: "rgba(255,0,0,0.06)",
              border: "1px solid rgba(255,0,0,0.12)",
              padding: 12,
              borderRadius: 12,
              color: "#8b0000",
              whiteSpace: "pre-wrap",
            }}
          >
            {err}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <Card
          title="Anfragen"
          right={
            <div style={{ opacity: 0.65, fontWeight: 700 }}>
              {loading ? "lädt..." : `${items.length}`}
            </div>
          }
        >
          {loading ? (
            <div style={{ opacity: 0.7 }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ opacity: 0.7 }}>Keine offenen Anfragen.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((x) => {
                const handle =
                  x.followerHandle ||
                  x.followerName ||
                  x.followerId.slice(0, 8);
                const label = x.followerName
                  ? `${x.followerName} (@${handle})`
                  : `@${handle}`;
                const isBusy = busyId === x.followerId;

                return (
                  <div
                    key={x.followerId}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <Link
                      to={`/u/${handle}`}
                      style={{ textDecoration: "none" }}
                      title="Zum Profil"
                    >
                      <Avatar url={x.followerAvatarUrl} handle={handle} />
                    </Link>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {label}
                      </div>
                      {x.createdAt ? (
                        <div
                          style={{ opacity: 0.65, marginTop: 4, fontSize: 13 }}
                        >
                          {new Date(x.createdAt).toLocaleString()}
                        </div>
                      ) : (
                        <div
                          style={{ opacity: 0.65, marginTop: 4, fontSize: 13 }}
                        >
                          Anfrage erhalten
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        disabled={isBusy}
                        onClick={() => onReject(x.followerId)}
                        style={{
                          border: "1px solid rgba(0,0,0,0.12)",
                          background: "white",
                          borderRadius: 12,
                          padding: "10px 12px",
                          fontWeight: 900,
                          cursor: isBusy ? "not-allowed" : "pointer",
                        }}
                      >
                        Reject
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => onAccept(x.followerId)}
                        style={{
                          border: "1px solid rgba(39,196,107,0.35)",
                          background: "rgba(39,196,107,0.14)",
                          color: "#0b6b3a",
                          borderRadius: 12,
                          padding: "10px 12px",
                          fontWeight: 900,
                          cursor: isBusy ? "not-allowed" : "pointer",
                        }}
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
