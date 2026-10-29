import { ChevronRight, HelpCircle, Shield, Bell, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

type HelpItem = {
  id: string;
  title: string;
  subtitle: string;
  path?: string;
  icon: React.ReactNode;
};

export default function HelpPage() {
  const nav = useNavigate();

  const items: HelpItem[] = [
    {
      id: "follow-requests",
      title: "Follow requests",
      subtitle: "Manage who can follow you",
      path: "/follow-requests",
      icon: <Users size={18} strokeWidth={2.2} />,
    },
    {
      id: "notifications",
      title: "Notifications",
      subtitle: "See activity and request updates",
      path: "/notifications",
      icon: <Bell size={18} strokeWidth={2.2} />,
    },
    {
      id: "privacy",
      title: "Privacy / Security",
      subtitle: "Privacy and account safety settings",
      path: "/privacy-security",
      icon: <Shield size={18} strokeWidth={2.2} />,
    },
    {
      id: "about",
      title: "About Fairwayd",
      subtitle: "Golf social, courses, destinations and your network",
      icon: <HelpCircle size={18} strokeWidth={2.2} />,
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
          Help / FAQ
        </div>

        <div
          style={{
            fontSize: 13,
            color: "var(--sub)",
            lineHeight: 1.4,
          }}
        >
          Quick help for the most important areas of Fairwayd
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
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--text)",
                  lineHeight: 1.2,
                }}
              >
                {item.title}
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

      <div
        style={{
          padding: "12px 12px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--sub)",
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        More detailed FAQ content can be added later. For now this page acts as
        a clean help hub.
      </div>
    </div>
  );
}
