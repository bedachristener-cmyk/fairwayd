import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { apiGet, apiPostForm, apiPostJson } from "../api";
import { fileUrl } from "../api/fileUrl";
import type { FieldPrivacy, Me } from "../auth/useMe";
import { getLang, setLang, t, type Lang } from "../i18n/strings";
import {
  getInitialTheme,
  setTheme,
  THEMES,
  type ThemeName,
} from "../theme/theme";

const MIN_HANDLE_LENGTH = 3;
const PRIVACY_OPTIONS: Array<{ value: FieldPrivacy; label: string }> = [
  { value: "PUBLIC", label: "Public" },
  { value: "FOLLOWERS", label: "Followers" },
  { value: "PRIVATE", label: "Private" },
];

function normalizeHandle(input: string) {
  return (input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

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

  if (s.includes("Handle is already taken") || s.includes("already taken")) {
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

function FieldPrivacySelector({
  value,
  onChange,
}: {
  value: FieldPrivacy;
  onChange: (value: FieldPrivacy) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {PRIVACY_OPTIONS.map((option) => {
        const active = value === option.value;

        return (
          <button
            className="profile-setup-pill"
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              padding: "9px 6px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: active ? "var(--text)" : "var(--card)",
              color: active ? "var(--bg)" : "var(--text)",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              minWidth: 0,
              boxShadow: active ? "0 8px 18px rgba(0,0,0,0.18)" : "none",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: 16,
        display: "grid",
        gap: 16,
        boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 950, letterSpacing: 0 }}>
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              marginTop: 5,
              color: "var(--sub)",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint ? (
        <div style={{ fontSize: 12, color: "var(--sub)", lineHeight: 1.35 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--muted)",
  color: "var(--text)",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontWeight: 900,
  fontSize: 12,
  color: "var(--sub)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

function ThemePicker() {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const dom = readDomTheme();
    return dom ?? getInitialTheme();
  });

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const dom = readDomTheme();
    if (dom && dom !== theme) setThemeState(dom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", gap: 9 }}>
      <div style={{ fontSize: 12, color: "var(--sub)", fontWeight: 900 }}>
        {t("theme")}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
          gap: 8,
        }}
      >
        {THEMES.map((tName) => {
          const active = theme === tName;

          return (
            <button
              className="profile-setup-pill"
              key={tName}
              type="button"
              onClick={() => setThemeState(tName)}
              style={{
                border: "1px solid var(--border)",
                background: active ? "var(--text)" : "var(--muted)",
                color: active ? "var(--bg)" : "var(--text)",
                borderRadius: 999,
                padding: "9px 10px",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 12,
                minWidth: 0,
              }}
              title={tName}
            >
              {tName.toUpperCase()}
            </button>
          );
        })}
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
  const [bio, setBio] = useState(me.bio ?? "");
  const [handicap, setHandicap] = useState(
    typeof me.handicap === "number" ? String(me.handicap) : "",
  );
  const [homeGolfClub, setHomeGolfClub] = useState(me.homeGolfClub ?? "");
  const [golfSlogan, setGolfSlogan] = useState(me.golfSlogan ?? "");
  const [favoriteGolfDestination, setFavoriteGolfDestination] = useState(
    me.favoriteGolfDestination ?? "",
  );
  const [bioPrivacy, setBioPrivacy] = useState<FieldPrivacy>(
    me.bioPrivacy ?? "PUBLIC",
  );
  const [handicapPrivacy, setHandicapPrivacy] = useState<FieldPrivacy>(
    me.handicapPrivacy ?? "PUBLIC",
  );
  const [homeGolfClubPrivacy, setHomeGolfClubPrivacy] =
    useState<FieldPrivacy>(me.homeGolfClubPrivacy ?? "PUBLIC");
  const [golfSloganPrivacy, setGolfSloganPrivacy] = useState<FieldPrivacy>(
    me.golfSloganPrivacy ?? "PUBLIC",
  );
  const [favoriteGolfDestinationPrivacy, setFavoriteGolfDestinationPrivacy] =
    useState<FieldPrivacy>(me.favoriteGolfDestinationPrivacy ?? "PUBLIC");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [lang, setLangState] = useState<Lang>(() => getLang());
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setAvatarPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setAvatarPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleHint = useMemo(() => {
    const h = normalizeHandle(handle);
    if (!h) return t("profile_handle_hint_required");
    if (!/^[a-z0-9_]+$/.test(h)) return t("profile_handle_hint_charset");
    if (h.length < MIN_HANDLE_LENGTH) return t("profile_handle_hint_min");
    if (h.length > 20) return t("profile_handle_hint_len");
    return "OK";
  }, [handle]);

  const avatarSrc = avatarPreview ?? (me.avatarUrl ? fileUrl(me.avatarUrl) : "");
  const avatarInitial = (name || handle || me.handle || "?")
    .slice(0, 1)
    .toUpperCase();

  const privacyFields: Array<{
    label: string;
    value: FieldPrivacy;
    onChange: (value: FieldPrivacy) => void;
  }> = [
    {
      label: "About me",
      value: bioPrivacy,
      onChange: setBioPrivacy,
    },
    {
      label: "Handicap",
      value: handicapPrivacy,
      onChange: setHandicapPrivacy,
    },
    {
      label: "Home golf club",
      value: homeGolfClubPrivacy,
      onChange: setHomeGolfClubPrivacy,
    },
    {
      label: "Golf slogan / motto",
      value: golfSloganPrivacy,
      onChange: setGolfSloganPrivacy,
    },
    {
      label: "Favorite golf destination",
      value: favoriteGolfDestinationPrivacy,
      onChange: setFavoriteGolfDestinationPrivacy,
    },
  ];

  const saveProfile = async () => {
    setMsg(null);
    const h = handle.trim();
    if (!h) {
      setMsg(t("handle_required"));
      return;
    }

    const normalizedHandle = normalizeHandle(h);

    if (normalizedHandle.length < MIN_HANDLE_LENGTH) {
      setMsg(t("profile_handle_hint_min"));
      return;
    }

    try {
      setBusy(true);

      const currentHandle = normalizeHandle(me.handle ?? "");

      if (normalizedHandle !== currentHandle) {
        const availability = await apiGet<{ available: boolean }>(
          `/users/handle-available?handle=${encodeURIComponent(normalizedHandle)}`,
        );

        if (!availability.available) {
          setMsg(t("handle_in_use"));
          return;
        }
      }

      await apiPostJson("/users/me/profile", {
        handle: h,
        name: name.trim() ? name.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
        handicap: handicap.trim() ? Number(handicap) : null,
        homeGolfClub: homeGolfClub.trim() ? homeGolfClub.trim() : null,
        golfSlogan: golfSlogan.trim() ? golfSlogan.trim() : null,
        favoriteGolfDestination: favoriteGolfDestination.trim()
          ? favoriteGolfDestination.trim()
          : null,
        bioPrivacy,
        handicapPrivacy,
        homeGolfClubPrivacy,
        golfSloganPrivacy,
        favoriteGolfDestinationPrivacy,
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
      className="profile-setup"
      style={{
        minHeight: "100dvh",
        background:
          "linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 86%, var(--card) 14%) 100%)",
        fontFamily: "system-ui",
        color: "var(--text)",
        padding:
          "18px 14px calc(104px + env(safe-area-inset-bottom, 0px))",
        boxSizing: "border-box",
      }}
    >
      <style>
        {`
          @media (max-width: 980px) {
            .profile-setup input,
            .profile-setup textarea,
            .profile-setup button {
              border-radius: 14px !important;
            }

            .profile-setup .profile-setup-pill {
              border-radius: 999px !important;
            }
          }
        `}
      </style>

      <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 14 }}>
        <header style={{ padding: "4px 2px 8px", display: "grid", gap: 7 }}>
          <div style={{ color: "var(--sub)", fontSize: 12, fontWeight: 900 }}>
            Fairwayd
          </div>
          <h1 style={{ fontSize: 28, lineHeight: 1.08, margin: 0 }}>
            {t("profile_complete_title")}
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--sub)",
              lineHeight: 1.45,
              fontSize: 14,
              maxWidth: 560,
            }}
          >
            {t("profile_complete_subtitle")}
          </p>
        </header>

        <Section
          title="Avatar & Identity"
          subtitle="Set how other golfers recognize you in the feed."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 82,
                height: 82,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--muted)",
                display: "grid",
                placeItems: "center",
                color: "var(--text)",
                fontWeight: 950,
                fontSize: 28,
                boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                avatarInitial
              )}
            </div>

            <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
              <div style={{ fontWeight: 900 }}>{t("profile_avatar_label")}</div>
              <label
                className="profile-setup-pill"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "fit-content",
                  maxWidth: "100%",
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--muted)",
                  color: "var(--text)",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                Choose image
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;

                    const resized = await resizeImage(f);

                    setFile(resized);
                  }}
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: "none",
                  }}
                />
              </label>
              {file ? (
                <div style={{ color: "var(--sub)", fontSize: 12 }}>
                  {file.name}
                </div>
              ) : null}
            </div>
          </div>

          <FormField label={t("profile_handle_label")} hint={handleHint}>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={t("profile_handle_placeholder")}
              style={inputStyle}
            />
          </FormField>

          <FormField label={t("profile_name_label")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("profile_name_placeholder")}
              style={inputStyle}
            />
          </FormField>

          <FormField label="About me">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={240}
              placeholder="A short intro for other golfers..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45 }}
            />
          </FormField>
        </Section>

        <Section
          title="Golf Profile"
          subtitle="Add the details golfers naturally look for."
        >
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <FormField label="Handicap">
              <input
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                placeholder="e.g. 12.4"
                type="number"
                step="0.1"
                min="-10"
                max="54"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Home golf club">
              <input
                value={homeGolfClub}
                onChange={(e) => setHomeGolfClub(e.target.value)}
                placeholder="e.g. Royal Johannesburg"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Golf slogan / motto">
              <input
                value={golfSlogan}
                onChange={(e) => setGolfSlogan(e.target.value)}
                placeholder="e.g. Fairways first"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Favorite golf destination">
              <input
                value={favoriteGolfDestination}
                onChange={(e) => setFavoriteGolfDestination(e.target.value)}
                placeholder="e.g. Cape Town"
                style={inputStyle}
              />
            </FormField>
          </div>
        </Section>

        <Section
          title="Field Privacy"
          subtitle="Choose who can see each profile detail."
        >
          <div style={{ display: "grid", gap: 12 }}>
            {privacyFields.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--muted)",
                }}
              >
                <div style={{ fontWeight: 850, fontSize: 13 }}>
                  {item.label}
                </div>
                <FieldPrivacySelector
                  value={item.value}
                  onChange={item.onChange}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Appearance & Language"
          subtitle={t("profile_language_help")}
        >
          <ThemePicker />

          <div style={{ display: "grid", gap: 9 }}>
            <div style={{ fontSize: 12, color: "var(--sub)", fontWeight: 900 }}>
              {t("language")}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))",
                gap: 8,
              }}
            >
              {(["en", "de", "fr", "it", "es", "ko", "th"] as Lang[]).map(
                (code) => {
                  const active = lang === code;

                  return (
                    <button
                      className="profile-setup-pill"
                      key={code}
                      type="button"
                      onClick={() => {
                        setLangState(code);
                        setLang(code);
                      }}
                      style={{
                        border: "1px solid var(--border)",
                        background: active ? "var(--text)" : "var(--muted)",
                        color: active ? "var(--bg)" : "var(--text)",
                        borderRadius: 999,
                        padding: "9px 10px",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 12,
                        minWidth: 0,
                      }}
                      title={code.toUpperCase()}
                    >
                      {code === "ko"
                        ? "KO"
                        : code === "th"
                          ? "TH"
                          : code.toUpperCase()}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </Section>

        {msg && (
          <div
            style={{
              padding: 12,
              borderRadius: 16,
              background: "var(--danger-soft)",
              border:
                "1px solid color-mix(in srgb, var(--danger) 34%, transparent)",
              color: "var(--text)",
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            {msg}
          </div>
        )}

        <button
          onClick={saveProfile}
          disabled={busy}
          style={{
            position: "sticky",
            bottom: "calc(78px + env(safe-area-inset-bottom, 0px))",
            padding: "13px 16px",
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: busy ? "var(--muted)" : "var(--text)",
            color: busy ? "var(--sub)" : "var(--bg)",
            fontWeight: 950,
            cursor: busy ? "not-allowed" : "pointer",
            width: "100%",
            boxShadow: "0 14px 32px rgba(0,0,0,0.28)",
            zIndex: 2,
          }}
        >
          {busy ? t("profile_saving") : t("profile_save")}
        </button>
      </div>
    </div>
  );
}
