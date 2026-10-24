import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";
import MobilePageHeader from "../components/MobilePageHeader";

type AccountPrivacy = "PUBLIC" | "PRIVATE";
type ReportTarget = "POST" | "COMMENT" | "PROFILE" | "OTHER";
type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "HATE"
  | "MISINFORMATION"
  | "INAPPROPRIATE"
  | "OTHER";

type UserSummary = {
  id: string;
  handle: string | null;
  name: string | null;
  avatarUrl: string | null;
  blockedAt?: string;
};

const cardStyle: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxSizing: "border-box",
  width: "100%",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "var(--text)",
  margin: 0,
};

const textStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--sub)",
  margin: 0,
};

const labelStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--text)",
  margin: 0,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "11px 12px",
  background: "var(--bg)",
  color: "var(--text)",
  font: "inherit",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: "rgba(220, 38, 38, 0.45)",
  color: "#dc2626",
};

function responseMessage(data: unknown, fallback: string) {
  if (
    data &&
    typeof data === "object" &&
    "message" in data
  ) {
    const message = (data as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export default function PrivacySecurityPage() {
  const { logout, token, refreshMe } = useAuth();
  const { me, setMe } = useMe(true);
  const [privacy, setPrivacy] = useState<AccountPrivacy>("PRIVATE");
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState<string | null>(null);

  const [blockedUsers, setBlockedUsers] = useState<UserSummary[]>([]);
  const [blockQuery, setBlockQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [safetyMsg, setSafetyMsg] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<ReportTarget>("POST");
  const [reportReference, setReportReference] = useState("");
  const [reportReason, setReportReason] = useState<ReportReason>("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const authFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const response = await fetch(`${API_BASE}${url}`, {
        ...init,
        headers: {
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseMessage(data, "The request could not be completed."));
      }
      return data;
    },
    [token],
  );

  const loadBlockedUsers = useCallback(async () => {
    try {
      const data = (await authFetch("/safety/blocked-users")) as {
        items?: UserSummary[];
      };
      setBlockedUsers(data.items ?? []);
    } catch (error) {
      setSafetyMsg(
        error instanceof Error ? error.message : "Could not load blocked users.",
      );
    }
  }, [authFetch]);

  useEffect(() => {
    if (me?.privacy) setPrivacy(me.privacy);
  }, [me?.privacy]);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  useEffect(() => {
    const query = blockQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/users/search?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Could not search users.");
        const data = (await response.json()) as UserSummary[];
        setSearchResults(data.filter((item) => item.id !== me?.id));
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSafetyMsg(
            error instanceof Error ? error.message : "Could not search users.",
          );
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [blockQuery, me?.id, token]);

  const savePrivacy = async (nextPrivacy: AccountPrivacy) => {
    if (privacyBusy || nextPrivacy === privacy) return;
    setPrivacyBusy(true);
    setPrivacyMsg(null);
    try {
      const updated = await authFetch("/users/me/privacy", {
        method: "PATCH",
        body: JSON.stringify({ privacy: nextPrivacy }),
      });
      setPrivacy(nextPrivacy);
      setMe((current) =>
        current ? { ...current, privacy: nextPrivacy } : updated,
      );
      await refreshMe();
      setPrivacyMsg("Account privacy updated.");
    } catch (error) {
      setPrivacyMsg(
        error instanceof Error ? error.message : "Could not update privacy.",
      );
    } finally {
      setPrivacyBusy(false);
    }
  };

  const blockUser = async (user: UserSummary) => {
    if (safetyBusy) return;
    setSafetyBusy(true);
    setSafetyMsg(null);
    try {
      await authFetch(`/safety/blocked-users/${encodeURIComponent(user.id)}`, {
        method: "POST",
      });
      setBlockQuery("");
      setSearchResults([]);
      await loadBlockedUsers();
      setSafetyMsg(`${user.name || `@${user.handle}`} is blocked.`);
    } catch (error) {
      setSafetyMsg(
        error instanceof Error ? error.message : "Could not block this user.",
      );
    } finally {
      setSafetyBusy(false);
    }
  };

  const unblockUser = async (user: UserSummary) => {
    if (safetyBusy) return;
    setSafetyBusy(true);
    setSafetyMsg(null);
    try {
      await authFetch(`/safety/blocked-users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      setBlockedUsers((items) => items.filter((item) => item.id !== user.id));
      setSafetyMsg(`${user.name || `@${user.handle}`} is unblocked.`);
    } catch (error) {
      setSafetyMsg(
        error instanceof Error ? error.message : "Could not unblock this user.",
      );
    } finally {
      setSafetyBusy(false);
    }
  };

  const submitReport = async () => {
    if (reportBusy || !reportReference.trim()) return;
    setReportBusy(true);
    setReportMsg(null);
    const reference = reportReference.trim();
    const isUrl = /^https?:\/\//i.test(reference);
    try {
      await authFetch("/safety/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: reportTarget,
          ...(isUrl ? { targetUrl: reference } : { targetId: reference }),
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setReportReference("");
      setReportDetails("");
      setReportMsg("Report submitted. Thank you.");
    } catch (error) {
      setReportMsg(
        error instanceof Error ? error.message : "Could not submit report.",
      );
    } finally {
      setReportBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteBusy || deleteConfirmation !== "DELETE") return;
    setDeleteBusy(true);
    setDeleteMsg(null);
    try {
      await authFetch("/users/me", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      logout();
      window.location.assign("/");
    } catch (error) {
      setDeleteMsg(
        error instanceof Error ? error.message : "Could not delete account.",
      );
      setDeleteBusy(false);
    }
  };

  const changePassword = async () => {
    if (passwordBusy) return;
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("New passwords do not match.");
      return;
    }

    try {
      setPasswordBusy(true);
      await authFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password changed.");
    } catch (error) {
      setPasswordMsg(
        error instanceof Error ? error.message : "Could not change password.",
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "16px 12px 100px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <MobilePageHeader
        title="Privacy & Security"
        subtitle="Control who can follow you, manage blocked accounts and protect your data."
      />

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Account privacy</h2>
        <p style={textStyle}>
          Public accounts accept followers immediately. Private accounts let
          you approve each new follower.
        </p>
        <div
          role="group"
          aria-label="Account privacy"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {(["PUBLIC", "PRIVATE"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => void savePrivacy(option)}
              disabled={privacyBusy}
              aria-pressed={privacy === option}
              style={{
                ...buttonStyle,
                background:
                  privacy === option ? "var(--brand, #166534)" : "var(--bg)",
                color: privacy === option ? "#fff" : "var(--text)",
                opacity: privacyBusy ? 0.65 : 1,
              }}
            >
              {option === "PUBLIC" ? "Public" : "Private"}
            </button>
          ))}
        </div>
        <p style={textStyle}>
          Posts still have their own audience: Public, Followers or Private.
        </p>
        {privacyMsg ? <p role="status" style={textStyle}>{privacyMsg}</p> : null}
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Blocked users</h2>
        <p style={textStyle}>
          Blocking removes follow connections. You will no longer see each
          other in feeds, search, comments or interactions.
        </p>
        <label style={labelStyle} htmlFor="block-user-search">
          Find a user
        </label>
        <input
          id="block-user-search"
          value={blockQuery}
          onChange={(event) => setBlockQuery(event.target.value)}
          placeholder="Name or @handle"
          autoComplete="off"
          style={inputStyle}
        />
        {searchResults.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {searchResults.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                actionLabel="Block"
                disabled={safetyBusy}
                onAction={() => void blockUser(user)}
              />
            ))}
          </div>
        ) : null}
        {blockedUsers.length ? (
          <>
            <p style={labelStyle}>Blocked</p>
            <div style={{ display: "grid", gap: 8 }}>
              {blockedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  actionLabel="Unblock"
                  disabled={safetyBusy}
                  onAction={() => void unblockUser(user)}
                />
              ))}
            </div>
          </>
        ) : (
          <p style={textStyle}>You have not blocked anyone.</p>
        )}
        {safetyMsg ? <p role="status" style={textStyle}>{safetyMsg}</p> : null}
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Report content</h2>
        <p style={textStyle}>
          Paste the link or ID of a post, comment or profile. Reports are
          private and stored for review.
        </p>
        <label style={labelStyle} htmlFor="report-target">Content type</label>
        <select
          id="report-target"
          value={reportTarget}
          onChange={(event) => setReportTarget(event.target.value as ReportTarget)}
          style={inputStyle}
        >
          <option value="POST">Post</option>
          <option value="COMMENT">Comment</option>
          <option value="PROFILE">Profile</option>
          <option value="OTHER">Other</option>
        </select>
        <label style={labelStyle} htmlFor="report-reference">Link or ID</label>
        <input
          id="report-reference"
          value={reportReference}
          onChange={(event) => setReportReference(event.target.value)}
          placeholder="https://… or content ID"
          style={inputStyle}
        />
        <label style={labelStyle} htmlFor="report-reason">Reason</label>
        <select
          id="report-reason"
          value={reportReason}
          onChange={(event) => setReportReason(event.target.value as ReportReason)}
          style={inputStyle}
        >
          <option value="SPAM">Spam</option>
          <option value="HARASSMENT">Harassment</option>
          <option value="HATE">Hate or abuse</option>
          <option value="MISINFORMATION">Misinformation</option>
          <option value="INAPPROPRIATE">Inappropriate content</option>
          <option value="OTHER">Other</option>
        </select>
        <label style={labelStyle} htmlFor="report-details">Details (optional)</label>
        <textarea
          id="report-details"
          value={reportDetails}
          onChange={(event) => setReportDetails(event.target.value)}
          maxLength={1000}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <button
          type="button"
          onClick={() => void submitReport()}
          disabled={reportBusy || !reportReference.trim()}
          style={{
            ...buttonStyle,
            opacity: reportBusy || !reportReference.trim() ? 0.6 : 1,
          }}
        >
          {reportBusy ? "Submitting…" : "Submit report"}
        </button>
        {reportMsg ? <p role="status" style={textStyle}>{reportMsg}</p> : null}
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Password</h2>
        {me?.hasPasswordLogin ? (
          <>
            <p style={textStyle}>Change the password used for email sign-in.</p>
            <label style={labelStyle} htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              style={inputStyle}
            />
            <label style={labelStyle} htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              style={inputStyle}
            />
            <label style={labelStyle} htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => void changePassword()}
              disabled={
                passwordBusy ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              style={{
                ...buttonStyle,
                opacity:
                  passwordBusy ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                    ? 0.6
                    : 1,
              }}
            >
              {passwordBusy ? "Changing…" : "Change password"}
            </button>
            {passwordMsg ? <p role="status" style={textStyle}>{passwordMsg}</p> : null}
          </>
        ) : (
          <>
            <p style={textStyle}>
              No Fairwayd password is stored for this account. You can create or
              reset a Fairwayd password using the email address linked to your
              account. Your Google password is not affected.
            </p>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.assign("/?auth=forgot-password");
              }}
              style={buttonStyle}
            >
              Reset your Fairwayd password
            </button>
            <p style={textStyle}>
              You will be signed out and taken directly to password reset.
            </p>
          </>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Account</h2>
        <button type="button" onClick={logout} style={buttonStyle}>
          Log out
        </button>
        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            style={dangerButtonStyle}
          >
            Delete account
          </button>
        ) : (
          <div
            style={{
              border: "1px solid rgba(220, 38, 38, 0.35)",
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <p style={{ ...textStyle, color: "#dc2626", fontWeight: 700 }}>
              This permanently deletes your account, posts, follows and trips
              you created. Type DELETE to continue.
            </p>
            <label style={labelStyle} htmlFor="delete-confirmation">
              Confirmation
            </label>
            <input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              autoComplete="off"
              style={inputStyle}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirmation("");
                  setDeleteMsg(null);
                }}
                disabled={deleteBusy}
                style={buttonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={deleteBusy || deleteConfirmation !== "DELETE"}
                style={{
                  ...dangerButtonStyle,
                  opacity:
                    deleteBusy || deleteConfirmation !== "DELETE" ? 0.55 : 1,
                }}
              >
                {deleteBusy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
            {deleteMsg ? <p role="alert" style={textStyle}>{deleteMsg}</p> : null}
          </div>
        )}
      </section>
    </div>
  );
}

function UserRow({
  user,
  actionLabel,
  disabled,
  onAction,
}: {
  user: UserSummary;
  actionLabel: string;
  disabled: boolean;
  onAction: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 10,
      }}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          width={38}
          height={38}
          style={{ borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "var(--border)",
          }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ ...labelStyle, overflow: "hidden", textOverflow: "ellipsis" }}>
          {user.name || "Fairwayd user"}
        </p>
        <p style={textStyle}>{user.handle ? `@${user.handle}` : ""}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        style={{
          ...buttonStyle,
          width: "auto",
          padding: "8px 12px",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
