import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  acceptFollowRequest,
  fetchFollowRequests,
  rejectFollowRequest,
  type FollowRequestItem,
} from "../api/followRequests";
import { fileUrl } from "../api/fileUrl";

function Avatar({
  url,
  handle,
  size = 48,
}: {
  url?: string | null;
  handle: string;
  size?: number;
}) {
  const letter = (handle?.[0] ?? "?").toUpperCase();

  if (url) {
    return (
      <img
        src={fileUrl(url)}
        alt={handle}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          maxWidth: size,
          maxHeight: size,
          borderRadius: 999,
          objectFit: "cover",
          border: "1px solid var(--border)",
          flexShrink: 0,
          display: "block",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        color: "var(--text)",
        fontWeight: 900,
        border: "1px solid var(--border)",
        flexShrink: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {letter}
    </div>
  );
}

function getRequestHandle(x: FollowRequestItem) {
  return x.followerHandle || x.followerName || x.followerId.slice(0, 8);
}

function getRequestLabel(x: FollowRequestItem) {
  const handle = getRequestHandle(x);
  return x.followerName ? x.followerName : `@${handle}`;
}

function getRequestIntroFields(x: FollowRequestItem) {
  return [
    x.bio ? { label: "Bio", value: x.bio.trim() } : null,
    x.homeGolfClub ? { label: "Home club", value: x.homeGolfClub } : null,
    x.handicap !== null && typeof x.handicap !== "undefined"
      ? { label: "Handicap", value: String(x.handicap) }
      : null,
    x.favoriteGolfDestination
      ? { label: "Favorite destination", value: x.favoriteGolfDestination }
      : null,
    x.golfSlogan ? { label: "Golf slogan", value: x.golfSlogan } : null,
  ].filter(
    (item): item is { label: string; value: string } =>
      Boolean(item?.value?.trim()),
  );
}

export default function FollowRequestsPage() {
  const { token } = useAuth() as any;
  const isMobile = window.innerWidth <= 720;
  const [items, setItems] = useState<FollowRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );

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
  const selectedRequest = useMemo(
    () => items.find((x) => x.followerId === selectedRequestId) ?? null,
    [items, selectedRequestId],
  );

  const onAccept = useCallback(
    async (followerId: string) => {
      setBusyId(followerId);
      setErr(null);

      try {
        await acceptFollowRequest(token, followerId);
        setItems((prev) => prev.filter((x) => x.followerId !== followerId));
        setSelectedRequestId(null);
        window.dispatchEvent(new Event("followRequestsUpdated"));
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
        setSelectedRequestId(null);
        window.dispatchEvent(new Event("followRequestsUpdated"));
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

      {selectedRequest ? (
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            display: "grid",
            gap: 14,
            border: "1px solid var(--border)",
            borderRadius: 16,
            background: "var(--card)",
            padding: 14,
            overflow: "hidden",
          }}
        >
          {(() => {
            const handle = getRequestHandle(selectedRequest);
            const label = getRequestLabel(selectedRequest);
            const fields = getRequestIntroFields(selectedRequest);
            const isBusy = busyId === selectedRequest.followerId;

            return (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedRequestId(null)}
                  style={{
                    justifySelf: "start",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    borderRadius: 999,
                    padding: "8px 11px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ArrowLeft size={14} strokeWidth={2.4} />
                  Back to requests
                </button>

                <div
                  style={{
                    display: "grid",
                    justifyItems: "center",
                    textAlign: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <Avatar
                    url={selectedRequest.followerAvatarUrl}
                    handle={handle}
                    size={72}
                  />

                  <div style={{ minWidth: 0, maxWidth: "100%" }}>
                    <div
                      style={{
                        color: "var(--text)",
                        fontSize: 18,
                        fontWeight: 900,
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        color: "var(--sub)",
                        fontSize: 13,
                        lineHeight: 1.35,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      @{handle}
                    </div>
                    <div
                      style={{
                        color: "var(--sub)",
                        fontSize: 12,
                        lineHeight: 1.35,
                        marginTop: 3,
                      }}
                    >
                      {selectedRequest.createdAt
                        ? new Date(selectedRequest.createdAt).toLocaleString()
                        : "Request received"}
                    </div>
                  </div>
                </div>

                {fields.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      minWidth: 0,
                      maxWidth: "100%",
                    }}
                  >
                    {fields.map((field) => (
                      <div
                        key={`${field.label}-${field.value}`}
                        style={{
                          minWidth: 0,
                          maxWidth: "100%",
                          boxSizing: "border-box",
                          border: "1px solid var(--border)",
                          borderRadius: 14,
                          background: "var(--bg)",
                          padding: "9px 10px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            color: "var(--sub)",
                            fontSize: 10,
                            fontWeight: 900,
                            lineHeight: 1.2,
                            textTransform: "uppercase",
                          }}
                        >
                          {field.label}
                        </div>
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: field.label === "Bio" ? 13 : 14,
                            fontWeight: field.label === "Bio" ? 700 : 900,
                            lineHeight: 1.35,
                            marginTop: 3,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      color: "var(--sub)",
                      fontSize: 13,
                      lineHeight: 1.4,
                      textAlign: "center",
                    }}
                  >
                    No public intro details shared.
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onReject(selectedRequest.followerId)}
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      borderRadius: 12,
                      padding: "11px 12px",
                      fontWeight: 900,
                      cursor: isBusy ? "default" : "pointer",
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onAccept(selectedRequest.followerId)}
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--text)",
                      color: "var(--bg)",
                      borderRadius: 12,
                      padding: "11px 12px",
                      fontWeight: 900,
                      cursor: isBusy ? "default" : "pointer",
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    Accept
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
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
            const handle = getRequestHandle(x);
            const label = getRequestLabel(x);
            const subLabel = x.followerName
              ? `@${handle}`
              : "Wants to follow you";

            return (
              <button
                key={x.followerId}
                type="button"
                onClick={() => setSelectedRequestId(x.followerId)}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 12px",
                  overflow: "hidden",
                  borderBottom:
                    index === items.length - 1
                      ? "none"
                      : "1px solid var(--border)",
                  background: "transparent",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  color: "var(--text)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Avatar url={x.followerAvatarUrl} handle={handle} />

                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                    display: "grid",
                    gap: 3,
                    maxWidth: "100%",
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
                    gap: 6,
                    flexShrink: 0,
                    color: "var(--sub)",
                    fontSize: 12,
                    fontWeight: 800,
                    alignSelf: "center",
                  }}
                >
                  {!isMobile ? <span>View request</span> : null}
                  <ChevronRight size={18} strokeWidth={2.2} />
                </div>
              </button>
            );
          })
        )}
      </div>
      )}
    </div>
  );
}
