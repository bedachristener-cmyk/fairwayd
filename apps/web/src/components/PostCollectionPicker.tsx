import { useCallback, useEffect, useState } from "react";
import {
  apiDelete,
  apiGet,
  apiPost,
  friendlyApiErrorMessage,
} from "../api/client";
import { fileUrl } from "../api/fileUrl";
import { t } from "../i18n/strings";

export type PostCollectionSummary = {
  id: string;
  name: string;
  postCount: number;
  saved: boolean;
  coverImageUrl?: string | null;
};

type Props = {
  token: string;
  postId: string;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
};

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.8 4.8A2.3 2.3 0 0 1 9.1 2.5h5.8a2.3 2.3 0 0 1 2.3 2.3v16l-5.2-3.3-5.2 3.3z" />
    </svg>
  );
}

export default function PostCollectionPicker({
  token,
  postId,
  onClose,
  onChanged,
}: Props) {
  const [collections, setCollections] = useState<PostCollectionSummary[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 680);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ items: PostCollectionSummary[] }>(
        "/post-collections",
        {
          token,
          query: { postId },
        },
      );
      setCollections(Array.isArray(data.items) ? data.items : []);
    } catch (reason) {
      setError(friendlyApiErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [postId, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const toggle = async (collection: PostCollectionSummary) => {
    if (busyId) return;
    setBusyId(collection.id);
    setError(null);
    try {
      if (collection.saved) {
        await apiDelete(
          `/post-collections/${collection.id}/posts/${postId}`,
          { token },
        );
      } else {
        await apiPost(
          `/post-collections/${collection.id}/posts/${postId}`,
          { token },
        );
      }
      setCollections((current) =>
        current.map((item) =>
          item.id === collection.id
            ? {
                ...item,
                saved: !item.saved,
                postCount: Math.max(0, item.postCount + (item.saved ? -1 : 1)),
              }
            : item,
        ),
      );
      await onChanged();
    } catch (reason) {
      setError(friendlyApiErrorMessage(reason));
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const createAndSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await apiPost<{ id: string }>("/post-collections", {
        token,
        body: { name: trimmed },
      });
      await apiPost(`/post-collections/${created.id}/posts/${postId}`, {
        token,
      });
      setName("");
      setShowCreate(false);
      await load();
      await onChanged();
    } catch (reason) {
      setError(friendlyApiErrorMessage(reason));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(8,12,10,.58)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 18,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-collection-picker-title"
        style={{
          width: isMobile ? "100%" : "min(520px, 100%)",
          maxHeight: isMobile ? "min(82dvh, 720px)" : "min(720px, calc(100vh - 36px))",
          overflow: "auto",
          borderRadius: isMobile ? "26px 26px 0 0" : 26,
          border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
          borderBottom: isMobile ? "none" : undefined,
          background:
            "linear-gradient(155deg, color-mix(in srgb, var(--card) 98%, var(--bg)), var(--card))",
          color: "var(--text)",
          boxShadow: "0 28px 90px rgba(0,0,0,.42)",
          padding: isMobile
            ? "10px 16px calc(18px + env(safe-area-inset-bottom, 0px))"
            : 20,
          display: "grid",
          gap: 18,
        }}
      >
        {isMobile ? (
          <div
            aria-hidden="true"
            style={{
              width: 42,
              height: 5,
              borderRadius: 999,
              background: "color-mix(in srgb, var(--sub) 38%, transparent)",
              margin: "0 auto 2px",
            }}
          />
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div
              id="post-collection-picker-title"
              style={{ fontSize: 21, fontWeight: 950, letterSpacing: -0.3 }}
            >
              {t("save_to_collection")}
            </div>
            <div style={{ marginTop: 5, color: "var(--sub)", fontSize: 12 }}>
              {t("collection_private_hint")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            style={{
              width: 36,
              height: 36,
              flex: "0 0 auto",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              color: "var(--text)",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 11,
          }}
        >
          {loading ? (
            [0, 1].map((index) => (
              <div
                key={index}
                style={{
                  aspectRatio: "1.35 / 1",
                  borderRadius: 18,
                  background: "var(--muted)",
                  opacity: 0.72,
                }}
              />
            ))
          ) : (
            <>
              {collections.map((collection, index) => {
                const cover = collection.coverImageUrl
                  ? fileUrl(collection.coverImageUrl)
                  : null;
                const busy = busyId === collection.id;
                return (
                  <button
                    key={collection.id}
                    type="button"
                    disabled={busyId !== null}
                    aria-pressed={collection.saved}
                    onClick={() => toggle(collection)}
                    style={{
                      position: "relative",
                      minWidth: 0,
                      aspectRatio: "1.35 / 1",
                      overflow: "hidden",
                      borderRadius: 18,
                      border: collection.saved
                        ? "2px solid var(--accent-strong)"
                        : "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
                      background: cover
                        ? `url("${cover}") center / cover no-repeat`
                        : index % 3 === 0
                          ? "linear-gradient(145deg, #315b48, #152d25)"
                          : index % 3 === 1
                            ? "linear-gradient(145deg, #496274, #202e39)"
                            : "linear-gradient(145deg, #725c44, #33281e)",
                      color: "#fff",
                      padding: 0,
                      cursor: busyId ? "default" : "pointer",
                      textAlign: "left",
                      boxShadow: collection.saved
                        ? "0 8px 24px color-mix(in srgb, var(--accent) 25%, transparent)"
                        : "0 8px 20px rgba(0,0,0,.10)",
                      transform: collection.saved ? "translateY(-1px)" : "none",
                      transition: "transform .16s ease, border-color .16s ease, box-shadow .16s ease",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, rgba(0,0,0,.03) 22%, rgba(0,0,0,.76) 100%)",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 27,
                        height: 27,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        border: collection.saved
                          ? "1px solid rgba(255,255,255,.92)"
                          : "1px solid rgba(255,255,255,.58)",
                        background: collection.saved
                          ? "var(--accent-strong)"
                          : "rgba(10,14,12,.34)",
                        backdropFilter: "blur(8px)",
                        color: "#fff",
                      }}
                    >
                      {busy ? "…" : collection.saved ? "✓" : <BookmarkIcon />}
                    </span>
                    <span
                      style={{
                        position: "absolute",
                        left: 12,
                        right: 12,
                        bottom: 11,
                        display: "grid",
                        gap: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          lineHeight: 1.15,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textShadow: "0 1px 4px rgba(0,0,0,.42)",
                        }}
                      >
                        {collection.name}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.78)" }}>
                        {collection.postCount}
                      </span>
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                style={{
                  minWidth: 0,
                  aspectRatio: "1.35 / 1",
                  borderRadius: 18,
                  border: "1px dashed color-mix(in srgb, var(--sub) 52%, var(--border))",
                  background: "color-mix(in srgb, var(--muted) 72%, transparent)",
                  color: "var(--text)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  padding: 14,
                }}
              >
                <span style={{ display: "grid", placeItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 999,
                      background: "var(--text)",
                      color: "var(--bg)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 25,
                      fontWeight: 500,
                      lineHeight: 1,
                    }}
                  >
                    +
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 850 }}>
                    {t("new_collection")}
                  </span>
                </span>
              </button>
            </>
          )}
        </div>

        {!loading && collections.length === 0 && !showCreate ? (
          <div style={{ color: "var(--sub)", fontSize: 13, marginTop: -8 }}>
            {t("no_collections_yet")}
          </div>
        ) : null}

        {showCreate ? (
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 15,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900 }}>
              {t("new_collection")}
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <input
                autoFocus
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") createAndSave();
                  if (event.key === "Escape") setShowCreate(false);
                }}
                placeholder={t("collection_name_placeholder")}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 13,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  padding: "12px 13px",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="button"
                disabled={!name.trim() || creating}
                onClick={createAndSave}
                style={{
                  borderRadius: 13,
                  border: "1px solid var(--text)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  padding: "0 15px",
                  fontWeight: 900,
                  cursor: !name.trim() || creating ? "default" : "pointer",
                  opacity: !name.trim() || creating ? 0.5 : 1,
                }}
              >
                {creating ? "…" : t("create_and_save")}
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              color: "var(--danger, #c43d4f)",
              fontSize: 13,
              padding: "10px 12px",
              borderRadius: 12,
              background: "color-mix(in srgb, var(--danger, #c43d4f) 9%, transparent)",
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
