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
  size = 44,
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
          borderRadius: "999px",
          objectFit: "cover",
          display: "block",
          flexShrink: 0,
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
        borderRadius: "999px",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        background: "var(--border)",
        color: "var(--text)",
        fontSize: 13,
        fontWeight: 700,
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
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text)",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: "var(--sub)",
            }}
          >
            {count} {count === 1 ? "user" : "users"}
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <div
          style={{
            fontSize: 14,
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
                gap: 12,
                padding: 10,
                borderRadius: 14,
                background: "var(--bg)",
                border: "1px solid var(--border)",
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
                  gap: 12,
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
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: 14,
                      fontWeight: 700,
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
                      fontSize: 13,
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
