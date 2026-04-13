import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, RefreshCw, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  acceptFollowRequest,
  fetchFollowRequests,
  rejectFollowRequest,
  type FollowRequestItem,
} from "../api/followRequests";
import { fileUrl } from "../api/fileUrl";

function Avatar({ url, handle }: { url?: string | null; handle: string }) {
  const letter = (handle?.[0] ?? "?").toUpperCase();

  if (url) {
    return (
      <img
        src={fileUrl(url)}
        alt={handle}
        style={{
          width: 40,
          height: 40,
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
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        color: "var(--text)",
        fontWeight: 900,
        border: "1px solid var(--border)",
        flexShrink: 0,
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
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: 14,
        display: "grid",
        gap: 14,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
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
            display: "grid",
            gap: 4,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: "var(--text)",
              lineHeight: 1.2,
            }}
          >
            Follow Requests
          </div>

          <div
            style={{
              fontSize: 13,
              color: "var(--sub)",
              lineHeight: 1.4,
            }}
          >
            {pendingCount} open
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          style={{
            height: 34,
            padding: "0 12px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <RefreshCw size={14} strokeWidth={2.2} />
          Refresh
        </button>
      </div>

      {err ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            whiteSpace: "pre-wrap",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "14px 12px",
              color: "var(--sub)",
              fontSize: 13,
            }}
          >
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: "14px 12px",
              color: "var(--sub)",
              fontSize: 13,
            }}
          >
            No open requests.
          </div>
        ) : (
          items.map((x, index) => {
            const handle =
              x.followerHandle || x.followerName || x.followerId.slice(0, 8);

            const label = x.followerName ? x.followerName : `@${handle}`;
            const subLabel = x.followerName
              ? `@${handle}`
              : "Wants to follow you";
            const isBusy = busyId === x.followerId;

            return (
              <div
                key={x.followerId}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 12px",
                  borderBottom:
                    index === items.length - 1
                      ? "none"
                      : "1px solid var(--border)",
                  background: "transparent",
                }}
              >
                <Link
                  to={`/u/${handle}`}
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                  title="Open profile"
                >
                  <Avatar url={x.followerAvatarUrl} handle={handle} />
                </Link>

                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                    display: "grid",
                    gap: 3,
                  }}
                >
                  <Link
                    to={`/u/${handle}`}
                    style={{
                      textDecoration: "none",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "var(--text)",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {label}
                    </div>
                  </Link>

                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--sub)",
                      lineHeight: 1.35,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {subLabel}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--sub)",
                      lineHeight: 1.35,
                    }}
                  >
                    {x.createdAt
                      ? new Date(x.createdAt).toLocaleString()
                      : "Request received"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onReject(x.followerId)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--sub)",
                      cursor: isBusy ? "default" : "pointer",
                      opacity: isBusy ? 0.6 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title="Reject"
                    aria-label="Reject"
                  >
                    <X size={16} strokeWidth={2.4} />
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onAccept(x.followerId)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      cursor: isBusy ? "default" : "pointer",
                      opacity: isBusy ? 0.6 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title="Accept"
                    aria-label="Accept"
                  >
                    <Check size={16} strokeWidth={2.6} />
                  </button>

                  <Link
                    to={`/u/${handle}`}
                    style={{
                      textDecoration: "none",
                      color: "var(--sub)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title="Open profile"
                    aria-label="Open profile"
                  >
                    <ChevronRight size={18} strokeWidth={2.2} />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
