import { Bell, ChevronRight, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

type NotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  path?: string;
  icon: React.ReactNode;
  badge?: string;
};

export default function NotificationsPage() {
  const nav = useNavigate();
  const auth = useAuth() as any;

  const [followRequestCount, setFollowRequestCount] = useState(0);

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

  const items: NotificationItem[] = [
    {
      id: "follow-requests",
      title: "Follow requests",
      subtitle:
        followRequestCount > 0
          ? `${followRequestCount} open request${followRequestCount === 1 ? "" : "s"}`
          : "No open follow requests",
      path: "/follow-requests",
      icon: <UserPlus size={18} strokeWidth={2.2} />,
      badge: followRequestCount > 0 ? String(followRequestCount) : undefined,
    },
    {
      id: "coming-soon",
      title: "More notifications soon",
      subtitle: "Likes, comments and other activity will appear here",
      icon: <Bell size={18} strokeWidth={2.2} />,
    },
  ];

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
          minWidth: 0,
          display: "grid",
          gap: 4,
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
          Notifications
        </div>

        <div
          style={{
            fontSize: 13,
            color: "var(--sub)",
            lineHeight: 1.4,
          }}
        >
          Updates about your network and activity
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        {items.map((item, index) => (
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
              padding: "14px 12px",
              border: 0,
              borderBottom:
                index === items.length - 1 ? "none" : "1px solid var(--border)",
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
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--sub)",
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
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
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
      </div>
    </div>
  );
}
