import { useCallback, useEffect, useState } from "react";
import {
  apiDelete,
  apiGet,
  apiPost,
  friendlyApiErrorMessage,
} from "../api/client";
import { t } from "../i18n/strings";

export type PostCollectionSummary = {
  id: string;
  name: string;
  postCount: number;
  saved: boolean;
};

type Props = {
  token: string;
  postId: string;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
};

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
      await load();
      await onChanged();
    } catch (reason) {
      setError(friendlyApiErrorMessage(reason));
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
        background: "rgba(0,0,0,.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-collection-picker-title"
        style={{
          width: "min(440px, 100%)",
          maxHeight: "min(680px, calc(100vh - 32px))",
          overflow: "auto",
          borderRadius: 22,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          boxShadow: "0 24px 70px rgba(0,0,0,.34)",
          padding: 18,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div
              id="post-collection-picker-title"
              style={{ fontSize: 19, fontWeight: 900 }}
            >
              {t("save_to_collection")}
            </div>
            <div style={{ marginTop: 4, color: "var(--sub)", fontSize: 12 }}>
              {t("collection_private_hint")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              color: "var(--text)",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {loading ? (
            <div style={{ color: "var(--sub)", fontSize: 13 }}>
              {t("loading")}
            </div>
          ) : collections.length ? (
            collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                disabled={busyId !== null}
                onClick={() => toggle(collection)}
                style={{
                  width: "100%",
                  minHeight: 48,
                  borderRadius: 14,
                  border: collection.saved
                    ? "1px solid var(--accent-strong)"
                    : "1px solid var(--border)",
                  background: collection.saved
                    ? "color-mix(in srgb, var(--accent) 13%, var(--card))"
                    : "var(--muted)",
                  color: "var(--text)",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: busyId ? "default" : "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontWeight: 800 }}>{collection.name}</span>
                <span
                  style={{
                    color: collection.saved
                      ? "var(--accent-strong)"
                      : "var(--sub)",
                    fontWeight: 850,
                    fontSize: 12,
                  }}
                >
                  {busyId === collection.id
                    ? "…"
                    : collection.saved
                      ? "✓"
                      : collection.postCount}
                </span>
              </button>
            ))
          ) : (
            <div
              style={{
                padding: "14px 12px",
                borderRadius: 14,
                background: "var(--muted)",
                color: "var(--sub)",
                fontSize: 13,
              }}
            >
              {t("no_collections_yet")}
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 14,
            display: "grid",
            gap: 9,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 850 }}>
            {t("new_collection")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createAndSave();
              }}
              placeholder={t("collection_name_placeholder")}
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                padding: "11px 12px",
                fontSize: 14,
              }}
            />
            <button
              type="button"
              disabled={!name.trim() || creating}
              onClick={createAndSave}
              style={{
                borderRadius: 12,
                border: "1px solid var(--accent-strong)",
                background: "var(--accent)",
                color: "#fff",
                padding: "0 14px",
                fontWeight: 850,
                cursor: !name.trim() || creating ? "default" : "pointer",
                opacity: !name.trim() || creating ? 0.55 : 1,
              }}
            >
              {creating ? "…" : t("create_and_save")}
            </button>
          </div>
        </div>

        {error ? (
          <div style={{ color: "var(--danger, #c43d4f)", fontSize: 13 }}>
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
