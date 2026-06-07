import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  acceptFollowRequest,
  fetchFollowRequests,
  fetchSentFollowRequests,
  rejectFollowRequest,
  type FollowRequestItem,
  type SentFollowRequestItem,
} from "../api/followRequests";
import { fileUrl } from "../api/fileUrl";
import { friendlyApiErrorMessage } from "../api/client";
import MobilePageHeader from "../components/MobilePageHeader";
import { EmptyState } from "../components/PolishStates";

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
  const [activeTab, setActiveTab] = useState<"incoming" | "sent">("incoming");
  const [items, setItems] = useState<FollowRequestItem[]>([]);
  const [sentItems, setSentItems] = useState<SentFollowRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      setSentItems([]);
      setErr("Your session has expired. Please login again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const [incomingData, sentData] = await Promise.all([
        fetchFollowRequests(token),
        fetchSentFollowRequests(token),
      ]);
      const incomingList = Array.isArray(incomingData)
        ? incomingData
        : Array.isArray((incomingData as any)?.items)
          ? (incomingData as any).items
          : [];
      const sentList = Array.isArray(sentData)
        ? sentData
        : Array.isArray((sentData as any)?.items)
          ? (sentData as any).items
          : [];

      setItems(incomingList);
      setSentItems(sentList);
    } catch (e: any) {
      setErr(friendlyApiErrorMessage(e, "Could not load follow requests."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(() => items.length, [items]);
  const sentCount = useMemo(() => sentItems.length, [sentItems]);
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
        setErr(friendlyApiErrorMessage(e, "Could not accept this request."));
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
        setErr(friendlyApiErrorMessage(e, "Could not reject this request."));
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
      <MobilePageHeader
        title="Follow Requests"
        subtitle={
          activeTab === "incoming"
            ? "People who want to follow you."
            : "People you requested to follow."
        }
        action={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            style={{
              minHeight: 40,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontWeight: 800,
              fontSize: 12,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.68 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <RefreshCw size={14} strokeWidth={2.2} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

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

      {!selectedRequest ? (
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "var(--bg)",
            padding: 4,
            borderRadius: 12,
            border: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("incoming")}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background:
                activeTab === "incoming" ? "var(--card)" : "transparent",
              color: "var(--text)",
            }}
          >
            Incoming {pendingCount > 0 ? `(${pendingCount})` : ""}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              background: activeTab === "sent" ? "var(--card)" : "transparent",
              color: "var(--text)",
            }}
          >
            Sent {sentCount > 0 ? `(${sentCount})` : ""}
          </button>
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
      ) : activeTab === "incoming" ? (
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
          <EmptyState
            title="No incoming requests"
            body="When golfers request to follow you, they will appear here."
            style={{ margin: 12 }}
          />
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
          ) : sentItems.length === 0 ? (
            <EmptyState
              title="No pending requests"
              body="Follow requests you send will appear here."
              style={{ margin: 12 }}
            />
          ) : (
            sentItems.map((x, index) => {
              const handle =
                x.followingHandle ||
                x.followingName ||
                x.followingId.slice(0, 8);
              const label = x.followingName ? x.followingName : `@${handle}`;

              return (
                <div
                  key={x.followingId}
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
                      index === sentItems.length - 1
                        ? "none"
                        : "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <Avatar url={x.followingAvatarUrl} handle={handle} />

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
                      @{handle}
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
                        : "Request sent"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
