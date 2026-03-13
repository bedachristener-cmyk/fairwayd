import { useEffect, useMemo, useState } from "react";
import { apiPostForm, apiPostJson } from "../api";
import type { Me } from "../auth/useMe";
import { getLang, setLang, t, type Lang } from "../i18n/strings";
import {
  getInitialTheme,
  setTheme,
  THEMES,
  type ThemeName,
} from "../theme/theme";
async function resizeImage(file: File): Promise<File> {
  const img = document.createElement("img");
  const reader = new FileReader();

  const dataUrl: string = await new Promise((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  img.src = dataUrl;

  await new Promise((resolve) => (img.onload = resolve));

  const canvas = document.createElement("canvas");

  const MAX_WIDTH = 1600;

  const scale = Math.min(1, MAX_WIDTH / img.width);

  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8),
  );

  return new File([blob], file.name, { type: "image/jpeg" });
}
function toFriendlyProfileError(e: any): string {
  const raw =
    (typeof e === "string" ? e : e?.message) ??
    (e?.responseText as string | undefined) ??
    "";

  const s = String(raw);

  if (s.includes("Handle already taken") || s.includes("already taken")) {
    return t("handle_in_use");
  }

  if (
    s.toLowerCase().includes("conflict") &&
    s.toLowerCase().includes("handle")
  ) {
    return t("handle_in_use");
  }

  return t("profile_update_failed");
}

function readDomTheme(): ThemeName | null {
  try {
    const dom = document.documentElement.getAttribute("data-theme");
    if (dom && (THEMES as readonly string[]).includes(dom))
      return dom as ThemeName;
    return null;
  } catch {
    return null;
  }
}

/** Variant B: Theme picker under the avatar (no <select>, no OS bugs) */
function ThemePickerUnderAvatar() {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const dom = readDomTheme();
    return dom ?? getInitialTheme();
  });

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  // Sync once on mount (if theme applied in main.tsx earlier)
  useEffect(() => {
    const dom = readDomTheme();
    if (dom && dom !== theme) setThemeState(dom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ marginTop: 10, width: 240, maxWidth: "100%" }}>
      <div style={{ fontSize: 12, color: "var(--sub)", fontWeight: 900 }}>
        Theme
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        {THEMES.map((tName) => (
          <button
            key={tName}
            type="button"
            onClick={() => setThemeState(tName)}
            style={{
              border: "1px solid var(--border)",
              background:
                theme === tName ? "rgba(39,196,107,0.22)" : "rgba(0,0,0,0.18)",
              color: "var(--text)",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12,
              minWidth: 86,
            }}
            title={tName}
          >
            {tName.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 6, fontSize: 12, color: "var(--sub)" }}>
        Current: <b style={{ color: "var(--text)" }}>{theme}</b>
      </div>
    </div>
  );
}

export default function ProfileSetup({
  me,
  onDone,
}: {
  me: Me;
  onDone: () => Promise<void>;
}) {
  const [handle, setHandle] = useState(me.handle ?? "");
  const [name, setName] = useState(me.name ?? "");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [lang, setLangState] = useState<Lang>(() => getLang());

  const handleHint = useMemo(() => {
    const h = handle.trim().toLowerCase();
    if (!h) return t("profile_handle_hint_required");
    if (!/^[a-z0-9_]+$/.test(h)) return t("profile_handle_hint_charset");
    if (h.length > 20) return t("profile_handle_hint_len");
    return "OK";
  }, [handle]);

  const saveProfile = async () => {
    setMsg(null);
    const h = handle.trim();
    if (!h) {
      setMsg(t("handle_required"));
      return;
    }

    try {
      setBusy(true);

      await apiPostJson("/users/me/profile", {
        handle: h,
        name: name.trim() ? name.trim() : null,
      });

      if (file) {
        const form = new FormData();
        form.append("avatar", file);
        await apiPostForm("/users/me/avatar", form);
      }

      await onDone();
    } catch (e: any) {
      setMsg(toFriendlyProfileError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "40px auto",
        fontFamily: "system-ui",
        color: "var(--text)",
        padding: "0 14px",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,.45)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 18, borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 26, margin: 0 }}>
            {t("profile_complete_title")}
          </h1>
          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "var(--sub)",
              lineHeight: 1.5,
            }}
          >
            {t("profile_complete_subtitle")}
          </p>
        </div>

        {/* Avatar + Theme (Variant B: Theme under Avatar) */}
        <div style={{ padding: 18, borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            {t("profile_avatar_label")}
          </div>

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;

              const resized = await resizeImage(f);
              setFile(resized);
            }}
            style={{ color: "var(--sub)" }}
          />

          {/* ✅ Theme picker sits right under the avatar upload */}
          <ThemePickerUnderAvatar />
        </div>

        {/* Language */}
        <div style={{ padding: 18, borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            {t("language")}
          </div>
          <div style={{ color: "var(--sub)", fontSize: 13, marginBottom: 10 }}>
            {t("profile_language_help")}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["en", "de", "fr", "it", "es"] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLangState(code);
                  setLang(code);
                }}
                style={{
                  border: "1px solid var(--border)",
                  background:
                    lang === code
                      ? "rgba(39,196,107,0.18)"
                      : "rgba(0,0,0,0.18)",
                  color: "var(--text)",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                }}
                title={code.toUpperCase()}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: 18 }}>
          <label style={{ display: "block", fontWeight: 900, marginBottom: 6 }}>
            {t("profile_handle_label")}
          </label>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={t("profile_handle_placeholder")}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(0,0,0,0.18)",
              color: "var(--text)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--sub)" }}>
            {handleHint}
          </div>

          <label
            style={{
              display: "block",
              fontWeight: 900,
              marginTop: 14,
              marginBottom: 6,
            }}
          >
            {t("profile_name_label")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("profile_name_placeholder")}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(0,0,0,0.18)",
              color: "var(--text)",
              fontSize: 14,
              outline: "none",
            }}
          />

          {msg && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 12,
                background: "rgba(255,80,80,0.12)",
                border: "1px solid rgba(255,80,80,0.25)",
                color: "var(--text)",
                fontWeight: 800,
              }}
            >
              {msg}
            </div>
          )}

          <button
            onClick={saveProfile}
            disabled={busy}
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(39,196,107,0.35)",
              background: busy
                ? "rgba(255,255,255,0.06)"
                : "rgba(39,196,107,0.18)",
              color: "var(--text)",
              fontWeight: 900,
              cursor: busy ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            {busy ? t("profile_saving") : t("profile_save")}
          </button>
        </div>
      </div>
    </div>
  );
}
