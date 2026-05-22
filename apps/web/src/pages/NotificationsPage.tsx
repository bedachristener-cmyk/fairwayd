import { Bell, ChevronRight, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../api/notifications";
import { NotificationRowsSkeleton } from "../components/PolishStates";

type NotificationEntry = {
  id: string;
  title: string;
  subtitle: string;
  path?: string;
  icon: React.ReactNode;
  badge?: string;
};

type ActivityPreviewItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  unread?: boolean;
};

const activityPreviewItems: ActivityPreviewItem[] = [
  {
    id: "follow-request-updates",
    title: "Follow request updates will appear here",
    subtitle: "Requests, approvals, and network changes will stay clearly grouped.",
    time: "Preview",
    icon: "👥",
    unread: true,
  },
  {
    id: "destination-notes",
    title: "New local notes from followed destinations",
    subtitle: "Useful destination advice can surface without becoming a noisy feed.",
    time: "Soon",
    icon: "⛳",
    unread: true,
  },
  {
    id: "trip-updates",
    title: "Trip invite updates",
    subtitle: "Accepted invites and planning changes can land here.",
    time: "Soon",
    icon: "✈️",
  },
  {
    id: "useful-tip-reactions",
    title: "Useful reactions to your tips",
    subtitle: "Helpful community feedback can be shown without social noise.",
    time: "Soon",
    icon: "💡",
    unread: true,
  },
  {
    id: "followed-destination-posts",
    title: "New posts from destinations you follow",
    subtitle: "Destination activity can be summarized when this becomes live.",
    time: "Soon",
    icon: "📍",
  },
];

function ActivityGlyph({ icon }: { icon: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: 15,
        lineHeight: 1,
        filter: "saturate(0.82)",
        transform: "translateY(0.5px)",
      }}
    >
      {icon}
    </span>
  );
}

export default function NotificationsPage() {
  const nav = useNavigate();
  const auth = useAuth() as any;

  const [followRequestCount, setFollowRequestCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(
    null,
  );
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFollowRequestCount() {
      if (!auth?.token) {
        setFollowRequestCount(0);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/users/me/follow-requests`, {
          headers: { Authorization: `Bearer ${auth?.token}` },
        });

        if (!res.ok) {
          if (!cancelled) setFollowRequestCount(0);
          return;
        }

        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        if (!cancelled) {
          setFollowRequestCount(items.length);
        }
      } catch (err) {
        console.error("Failed to load follow request count", err);
        if (!cancelled) {
          setFollowRequestCount(0);
        }
      }
    }

    loadFollowRequestCount();

    return () => {
      cancelled = true;
    };
  }, [auth?.token]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (!auth?.token) {
        setNotifications([]);
        setNotificationsError(null);
        return;
      }

      setNotificationsLoading(true);
      setNotificationsError(null);

      try {
        const items = await fetchNotifications(auth?.token);

        if (!cancelled) {
          setNotifications(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        console.error("Failed to load notifications", err);

        if (!cancelled) {
          setNotifications([]);
          setNotificationsError("Notifications are unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [auth?.token]);

  const followRequestEntry: NotificationEntry = {
    id: "follow-requests",
    title: "Follow requests",
    subtitle:
      followRequestCount > 0
        ? `${followRequestCount} open request${followRequestCount === 1 ? "" : "s"} waiting for you`
        : "No open follow requests right now",
    path: "/follow-requests",
    icon: <UserPlus size={18} strokeWidth={2.2} />,
    badge: followRequestCount > 0 ? String(followRequestCount) : undefined,
  };

  const sectionStyle: React.CSSProperties = {
    borderRadius: 24,
    border: "1px solid color-mix(in srgb, var(--border) 68%, transparent)",
    background:
      "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), var(--card))",
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    overflow: "hidden",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: "14px 14px 10px",
    display: "grid",
    gap: 3,
  };

  const sectionTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.2,
    fontWeight: 900,
    color: "var(--text)",
  };

  const sectionSubtitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.35,
    color: "var(--sub)",
  };

  const actionableItems: NotificationEntry[] = [
    {
      ...followRequestEntry,
    },
  ];

  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const hasRealNotifications = notifications.length > 0;

  function getNotificationIcon(item: NotificationItem) {
    const type = item.type.toLowerCase();

    if (type.includes("follow")) {
      return "👥";
    }

    if (type.includes("trip")) {
      return "✈️";
    }

    if (type.includes("note")) {
      return "⛳";
    }

    if (
      type.includes("tip") ||
      type.includes("useful") ||
      type.includes("helpful")
    ) {
      return "💡";
    }

    if (type.includes("destination") || type.includes("post")) {
      return "📍";
    }

    return "🔔";
  }

  function getNotificationTime(createdAt: string) {
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  async function handleNotificationClick(item: NotificationItem) {
    if (!auth?.token || busyNotificationId) return;

    const wasUnread = !item.readAt;
    const readAt = new Date().toISOString();

    if (wasUnread) {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === item.id
            ? { ...notification, readAt }
            : notification,
        ),
      );
    }

    setBusyNotificationId(item.id);
    setNotificationsError(null);

    try {
      if (wasUnread) {
        const updated = await markNotificationRead(auth?.token, item.id);

        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === item.id ? updated : notification,
          ),
        );

        window.dispatchEvent(new Event("notificationsUpdated"));
      }

      if (item.link) {
        nav(item.link);
      }
    } catch (err) {
      console.error("Failed to mark notification read", err);

      if (wasUnread) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === item.id ? item : notification,
          ),
        );
      }

      setNotificationsError("Could not update that notification.");
    } finally {
      setBusyNotificationId(null);
    }
  }

  async function handleMarkAllRead() {
    if (!auth?.token || unreadCount === 0 || markingAllRead) return;

    const previous = notifications;
    const readAt = new Date().toISOString();

    setMarkingAllRead(true);
    setNotificationsError(null);
    setNotifications((prev) =>
      prev.map((item) => (item.readAt ? item : { ...item, readAt })),
    );

    try {
      await markAllNotificationsRead(auth?.token);
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
      setNotifications(previous);
      setNotificationsError("Could not mark notifications as read.");
    } finally {
      setMarkingAllRead(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "16px 14px 24px",
        display: "grid",
        gap: 16,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          minWidth: 0,
          display: "grid",
          gap: 8,
          padding: "4px 2px 0",
        }}
      >
        <div
          style={{
            width: "fit-content",
            minHeight: 28,
            padding: "0 10px",
            borderRadius: 999,
            border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
            background: "color-mix(in srgb, var(--muted) 72%, transparent)",
            color: "var(--sub)",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Bell size={13} strokeWidth={2.4} />
          Activity
        </div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "var(--text)",
            lineHeight: 1.05,
            letterSpacing: "-0.045em",
          }}
        >
          Notifications
        </div>

        <div
          style={{
            maxWidth: 420,
            fontSize: 14,
            color: "var(--sub)",
            lineHeight: 1.5,
          }}
        >
          Follow requests, useful tips, trip updates, and destination activity
          will collect here.
        </div>
      </div>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Follow requests</h2>
          <p style={sectionSubtitleStyle}>
            Review golfers who want to connect with you.
          </p>
        </div>

        {actionableItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.path) nav(item.path);
            }}
            style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px",
              border: 0,
              borderTop: index === 0 ? "1px solid var(--border)" : undefined,
              borderBottom:
                index === actionableItems.length - 1
                  ? "none"
                  : "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              textAlign: "left",
              cursor: item.path ? "pointer" : "default",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 14,
                border: "1px solid color-mix(in srgb, var(--green) 28%, var(--border))",
                background: "color-mix(in srgb, var(--green) 11%, var(--bg))",
                color: "var(--text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>

            <div
              style={{
                minWidth: 0,
                flex: 1,
                display: "grid",
                gap: 3,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--text)",
                    lineHeight: 1.2,
                  }}
                >
                  {item.title}
                </div>

                {item.badge ? (
                  <div
                    style={{
                      height: 20,
                      padding: "0 8px",
                      borderRadius: 999,
                      border: "1px solid color-mix(in srgb, var(--green) 42%, var(--border))",
                      background: "var(--green)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.badge}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "var(--sub)",
                  lineHeight: 1.35,
                  minWidth: 0,
                }}
              >
                {item.subtitle}
              </div>
            </div>

            <div
              style={{
                color: "var(--sub)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 4,
              }}
            >
              <ChevronRight size={18} strokeWidth={2.2} />
            </div>
          </button>
        ))}
      </section>

      {hasRealNotifications ? (
        <section style={sectionStyle}>
          <div
            style={{
              ...sectionHeaderStyle,
              gridTemplateColumns: "1fr auto",
              alignItems: "start",
              columnGap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
              <h2 style={sectionTitleStyle}>Recent notifications</h2>
              <p style={sectionSubtitleStyle}>
                {unreadCount > 0
                  ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                  : "Everything is read"}
              </p>
            </div>

            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                style={{
                  minHeight: 30,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontSize: 11,
                  fontWeight: 850,
                  cursor: markingAllRead ? "default" : "pointer",
                  opacity: markingAllRead ? 0.68 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {markingAllRead ? "Marking..." : "Mark all as read"}
              </button>
            ) : null}
          </div>

          {notificationsError ? (
            <div
              style={{
                margin: "0 14px 12px",
                padding: "9px 10px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--sub)",
                fontSize: 12,
                lineHeight: 1.35,
              }}
            >
              {notificationsError}
            </div>
          ) : null}

          <div
            style={{
              borderTop: "1px solid var(--border)",
              display: "grid",
            }}
          >
            {notifications.map((item, index) => {
              const unread = !item.readAt;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleNotificationClick(item)}
                  disabled={busyNotificationId === item.id}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "13px 14px",
                    border: 0,
                    borderBottom:
                      index === notifications.length - 1
                        ? "none"
                        : "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                    background: unread
                      ? "color-mix(in srgb, var(--green) 7%, transparent)"
                      : "transparent",
                    color: "var(--text)",
                    textAlign: "left",
                    cursor:
                      busyNotificationId === item.id ? "default" : "pointer",
                    opacity: busyNotificationId === item.id ? 0.72 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: unread ? "var(--text)" : "var(--sub)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <ActivityGlyph icon={getNotificationIcon(item)} />
                  </div>

                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      {unread ? (
                        <span
                          aria-hidden="true"
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            background: "var(--green)",
                            boxShadow:
                              "0 0 0 3px color-mix(in srgb, var(--green) 16%, transparent)",
                            flexShrink: 0,
                          }}
                        />
                      ) : null}

                      <div
                        style={{
                          minWidth: 0,
                          color: "var(--text)",
                          fontSize: 13,
                          lineHeight: 1.25,
                          fontWeight: unread ? 900 : 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </div>
                    </div>

                    {item.body ? (
                      <div
                        style={{
                          color: "var(--sub)",
                          fontSize: 12,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.body}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      color: "var(--sub)",
                      fontSize: 11,
                      lineHeight: 1.2,
                      fontWeight: 800,
                      flexShrink: 0,
                      paddingTop: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {getNotificationTime(item.createdAt)}
                    {item.link ? <ChevronRight size={15} strokeWidth={2.2} /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {!hasRealNotifications ? (
        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Activity preview</h2>
            <p style={sectionSubtitleStyle}>
              {notificationsLoading
                ? "Checking for live notifications..."
                : notificationsError
                  ? "Live notifications are unavailable, so this preview remains visible."
                  : "Coming soon examples only. These rows show the planned shape, not real account activity."}
            </p>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              display: "grid",
            }}
          >
            {notificationsLoading && auth?.token ? (
              <NotificationRowsSkeleton count={3} />
            ) : null}

            {!notificationsLoading || !auth?.token ? activityPreviewItems.map((item, index) => (
              <div
                key={item.id}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "13px 14px",
                  borderBottom:
                    index === activityPreviewItems.length - 1
                      ? "none"
                      : "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background: item.unread
                    ? "color-mix(in srgb, var(--green) 7%, transparent)"
                    : "transparent",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: item.unread ? "var(--text)" : "var(--sub)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ActivityGlyph icon={item.icon} />
                </div>

                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    {item.unread ? (
                      <span
                        aria-hidden="true"
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: "var(--green)",
                          boxShadow:
                            "0 0 0 3px color-mix(in srgb, var(--green) 16%, transparent)",
                          flexShrink: 0,
                        }}
                      />
                    ) : null}

                    <div
                      style={{
                        minWidth: 0,
                        color: "var(--text)",
                        fontSize: 13,
                        lineHeight: 1.25,
                        fontWeight: item.unread ? 900 : 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                  </div>

                  <div
                    style={{
                      color: "var(--sub)",
                      fontSize: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.subtitle}
                  </div>
                </div>

                <div
                  style={{
                    color: "var(--sub)",
                    fontSize: 11,
                    lineHeight: 1.2,
                    fontWeight: 800,
                    flexShrink: 0,
                    paddingTop: 2,
                  }}
                >
                  {item.time}
                </div>
              </div>
            )) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
