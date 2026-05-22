import type { ReactNode } from "react";

type UserListItem = {
  id: string;
  name?: string | null;
  handle?: string | null;
  avatarUrl?: string | null;
};

type UserListCardProps = {
  title: string;
  count: number;
  users: UserListItem[];
  emptyText: string;
  onUserClick?: (user: UserListItem) => void;
  actionRenderer?: (user: UserListItem) => ReactNode;
};

function getInitials(user: UserListItem) {
  const base = (user.name || user.handle || "?").trim();
  if (!base) return "?";

  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function AvatarCircle({
  user,
  size = 42,
}: {
  user: UserListItem;
  size?: number;
}) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name || user.handle || "User avatar"}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          maxWidth: size,
          maxHeight: size,
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          flexShrink: 0,
          boxSizing: "border-box",
          border: "2px solid color-mix(in srgb, var(--card) 88%, transparent)",
          boxShadow:
            "0 8px 20px rgba(0,0,0,0.12), 0 0 0 1px color-mix(in srgb, var(--border) 54%, transparent)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
        aspectRatio: "1 / 1",
        borderRadius: "999px",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--green) 18%, var(--muted)), var(--muted))",
        border: "1px solid color-mix(in srgb, var(--green) 42%, var(--border))",
        color: "var(--text)",
        fontSize: 12,
        fontWeight: 850,
        boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
      }}
    >
      {getInitials(user)}
    </div>
  );
}

export default function UserListCard({
  title,
  count,
  users,
  emptyText,
  onUserClick,
  actionRenderer,
}: UserListCardProps) {
  return (
    <section
      style={{
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--card) 94%, var(--green) 6%), color-mix(in srgb, var(--card) 98%, var(--bg)))",
        border: "1px solid color-mix(in srgb, var(--border) 46%, transparent)",
        borderRadius: 26,
        padding: 16,
        boxShadow: "0 14px 38px rgba(0,0,0,0.10)",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 850,
              color: "var(--text)",
              letterSpacing: -0.2,
            }}
          >
            {title}
          </div>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 30,
            height: 30,
            padding: "0 10px",
            borderRadius: 999,
            border: "1px solid color-mix(in srgb, var(--border) 46%, transparent)",
            background: "color-mix(in srgb, var(--muted) 58%, transparent)",
            color: "var(--sub)",
            fontSize: 12,
            fontWeight: 850,
            flexShrink: 0,
          }}
        >
          {count}
        </span>
      </div>

      {users.length === 0 ? (
        <div
          style={{
            padding: "15px 14px",
            borderRadius: 20,
            border: "1px solid color-mix(in srgb, var(--border) 42%, transparent)",
            background: "color-mix(in srgb, var(--muted) 54%, transparent)",
            fontSize: 13,
            lineHeight: 1.4,
            color: "var(--sub)",
          }}
        >
          {emptyText}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 11,
                padding: "12px",
                borderRadius: 22,
                background: "color-mix(in srgb, var(--muted) 54%, transparent)",
                border: "1px solid color-mix(in srgb, var(--border) 46%, transparent)",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                onClick={() => onUserClick?.(user)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  minWidth: 0,
                  flex: 1,
                  cursor: onUserClick ? "pointer" : "default",
                  textAlign: "left",
                }}
              >
                <AvatarCircle user={user} />

                <div
                  style={{
                    minWidth: 0,
                    display: "grid",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: 14,
                      fontWeight: 850,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.name || "Unnamed user"}
                  </div>

                  <div
                    style={{
                      color: "var(--sub)",
                      fontSize: 12,
                      fontWeight: 650,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.handle ? `@${user.handle}` : ""}
                  </div>
                </div>
              </button>

              {actionRenderer ? (
                <div style={{ flexShrink: 0 }}>{actionRenderer(user)}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
