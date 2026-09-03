import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { apiPostForm, apiPostJson } from "../api";
import type { Me } from "../auth/useMe";
import { getLang, setLang, t, type Lang } from "../i18n/strings";
import {
  getInitialTheme,
  setTheme,
  THEMES,
  type ThemeName,
} from "../theme/theme";

type FieldPrivacy = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
type AccountPrivacy = "PUBLIC" | "PRIVATE";

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
    if (dom && (THEMES as readonly string[]).includes(dom)) {
      return dom as ThemeName;
    }
    return null;
  } catch {
    return null;
  }
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontWeight: 950,
  marginBottom: 7,
  color: "var(--text)",
};

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
    <div
      style={{
        padding: 16,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 15, color: "var(--text)" }}>
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            marginTop: 4,
            marginBottom: 14,
            color: "var(--sub)",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </div>
      ) : (
        <div style={{ height: 12 }} />
      )}

      {children}
    </div>
  );
}

function PrivacyPicker({
  value,
  onChange,
}: {
  value: FieldPrivacy;
  onChange: (value: FieldPrivacy) => void;
}) {
  const items: { value: FieldPrivacy; label: string; icon: string }[] = [
    { value: "PUBLIC", label: "Public", icon: "🌍" },
    { value: "FOLLOWERS", label: "Followers", icon: "👥" },
    { value: "PRIVATE", label: "Private", icon: "🔒" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 7,
        marginTop: 8,
      }}
    >
      {items.map((item) => {
        const active = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            style={{
              border: "1px solid var(--border)",
              background: active ? "var(--control-selected-bg)" : "var(--card)",
              color: active ? "var(--control-selected-text)" : "var(--text)",
              borderRadius: 999,
              padding: "8px 7px",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              minWidth: 0,
            }}
          >
            <span>{item.icon}</span>
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AccountPrivacyPicker({
  value,
  onChange,
}: {
  value: AccountPrivacy;
  onChange: (value: AccountPrivacy) => void;
}) {
  const items: {
    value: AccountPrivacy;
    label: string;
    description: string;
  }[] = [
    {
      value: "PUBLIC",
      label: "Public",
      description: "Anyone can follow you immediately.",
    },
    {
      value: "PRIVATE",
      label: "Private",
      description: "New followers need your approval.",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {items.map((item) => {
        const active = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            style={{
              border: "1px solid var(--border)",
              background: active ? "var(--control-selected-bg)" : "var(--bg)",
              color: active ? "var(--control-selected-text)" : "var(--text)",
              borderRadius: 14,
              padding: "11px 12px",
              cursor: "pointer",
              textAlign: "left",
              display: "grid",
              gap: 4,
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 950, lineHeight: 1.2 }}>
              {item.label}
            </span>
            <span
              style={{
                color: active ? "var(--control-selected-subtext)" : "var(--sub)",
                fontSize: 12,
                fontWeight: 750,
                lineHeight: 1.35,
              }}
            >
              {item.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  privacy,
  onPrivacyChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  privacy: FieldPrivacy;
  onPrivacyChange: (value: FieldPrivacy) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>

      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{
            ...inputStyle,
            resize: "vertical",
            lineHeight: 1.45,
          }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}

      <PrivacyPicker value={privacy} onChange={onPrivacyChange} />
    </div>
  );
}

function ThemePickerUnderAvatar() {
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
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, color: "var(--sub)", fontWeight: 900 }}>
        Theme
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 7 }}>
        {THEMES.map((tName) => {
          const active = theme === tName;

          return (
            <button
              key={tName}
              type="button"
              onClick={() => setThemeState(tName)}
              style={{
                border: "1px solid var(--border)",
                background: active ? "var(--control-selected-bg)" : "var(--bg)",
                color: active ? "var(--control-selected-text)" : "var(--text)",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 950,
                fontSize: 12,
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
  const [file, setFile] = useState<File | null>(null);

  const [bio, setBio] = useState((me as any).bio ?? "");
  const [handicap, setHandicap] = useState(
    (me as any).handicap === null || (me as any).handicap === undefined
      ? ""
      : String((me as any).handicap),
  );
  const [homeGolfClub, setHomeGolfClub] = useState(
    (me as any).homeGolfClub ?? "",
  );
  const [golfSlogan, setGolfSlogan] = useState((me as any).golfSlogan ?? "");
  const [favoriteGolfDestination, setFavoriteGolfDestination] = useState(
    (me as any).favoriteGolfDestination ?? "",
  );

  const [bioPrivacy, setBioPrivacy] = useState<FieldPrivacy>(
    (me as any).bioPrivacy ?? "PUBLIC",
  );
  const [handicapPrivacy, setHandicapPrivacy] = useState<FieldPrivacy>(
    (me as any).handicapPrivacy ?? "FOLLOWERS",
  );
  const [homeGolfClubPrivacy, setHomeGolfClubPrivacy] = useState<FieldPrivacy>(
    (me as any).homeGolfClubPrivacy ?? "PUBLIC",
  );
  const [golfSloganPrivacy, setGolfSloganPrivacy] = useState<FieldPrivacy>(
    (me as any).golfSloganPrivacy ?? "PUBLIC",
  );
  const [favoriteGolfDestinationPrivacy, setFavoriteGolfDestinationPrivacy] =
    useState<FieldPrivacy>(
      (me as any).favoriteGolfDestinationPrivacy ?? "PUBLIC",
    );
  const [privacy, setPrivacy] = useState<AccountPrivacy>(
    (me as any).privacy === "PUBLIC" ? "PUBLIC" : "PRIVATE",
  );

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
    console.log("SAVE PROFILE CLICKED");
    setMsg(null);

    const h = handle.trim().toLowerCase();

    if (!h) {
      setMsg(t("handle_required"));
      return;
    }

    try {
      setBusy(true);

      await apiPostJson("/users/me/profile", {
        handle: h,
        name: name.trim() ? name.trim() : null,

        bio: bio.trim() ? bio.trim() : null,
        handicap: String(handicap).trim()
          ? Number(String(handicap).trim().replace(",", "."))
          : null,
        homeGolfClub: homeGolfClub.trim() ? homeGolfClub.trim() : null,
        golfSlogan: golfSlogan.trim() ? golfSlogan.trim() : null,
        favoriteGolfDestination: favoriteGolfDestination.trim()
          ? favoriteGolfDestination.trim()
          : null,

        privacy,
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
      console.error("PROFILE SAVE FAILED", e);
      console.error("PROFILE SAVE FAILED MESSAGE", e?.message);
      console.error("PROFILE SAVE FAILED RAW", JSON.stringify(e, null, 2));

      setMsg(toFriendlyProfileError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "22px auto",
        fontFamily: "system-ui",
        color: "var(--text)",
        padding: "0 12px 90px",
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          boxShadow: "0 14px 34px rgba(0,0,0,.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "22px 18px",
            borderBottom: "1px solid var(--border)",
            background:
              "linear-gradient(135deg, rgba(90,110,140,0.16), rgba(255,255,255,0.02))",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--sub)",
              fontWeight: 950,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 8,
            }}
          >
            Fairwayd profile
          </div>

          <h1 style={{ fontSize: 28, lineHeight: 1.05, margin: 0 }}>
            {t("profile_complete_title")}
          </h1>

          <p
            style={{
              marginTop: 9,
              marginBottom: 0,
              color: "var(--sub)",
              lineHeight: 1.5,
              fontSize: 14,
            }}
          >
            {t("profile_complete_subtitle")}
          </p>
        </div>

        <Section title="Profile photo" subtitle="Add a recognizable avatar.">
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
              width: "100%",
              color: "var(--sub)",
              border: "1px dashed var(--border)",
              borderRadius: 16,
              padding: 12,
              boxSizing: "border-box",
              background: "var(--bg)",
            }}
          />

          <ThemePickerUnderAvatar />
        </Section>

        <Section title={t("language")} subtitle={t("profile_language_help")}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["en", "de", "fr", "it", "es", "ko", "th"] as Lang[]).map(
              (code) => {
                const active = lang === code;

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLangState(code);
                      setLang(code);
                    }}
                    style={{
                      border: "1px solid var(--border)",
                      background: active ? "var(--control-selected-bg)" : "var(--bg)",
                      color: active ? "var(--control-selected-text)" : "var(--text)",
                      borderRadius: 999,
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontWeight: 950,
                      fontSize: 12,
                    }}
                    title={code.toUpperCase()}
                  >
                    {code.toUpperCase()}
                  </button>
                );
              },
            )}
          </div>
        </Section>

        <Section
          title="Basic profile"
          subtitle="This is how other golfers recognize you."
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={labelStyle}>{t("profile_handle_label")}</label>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder={t("profile_handle_placeholder")}
                style={inputStyle}
              />
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color:
                    handleHint === "OK"
                      ? "var(--sub)"
                      : "rgba(255,120,120,0.95)",
                  fontWeight: 800,
                }}
              >
                {handleHint}
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t("profile_name_label")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile_name_placeholder")}
                style={inputStyle}
              />
            </div>
          </div>
        </Section>

        <Section title="Profile privacy" subtitle="Choose who can follow you.">
          <AccountPrivacyPicker value={privacy} onChange={setPrivacy} />
        </Section>

        <Section
          title="Golf profile"
          subtitle="Tell others what kind of golfer you are. Each field has its own visibility."
        >
          <div style={{ display: "grid", gap: 18 }}>
            <ProfileField
              label="Bio"
              value={bio}
              onChange={setBio}
              placeholder="A few words about you..."
              privacy={bioPrivacy}
              onPrivacyChange={setBioPrivacy}
              textarea
            />

            <ProfileField
              label="Handicap"
              value={handicap}
              onChange={setHandicap}
              placeholder="e.g. 18.4"
              privacy={handicapPrivacy}
              onPrivacyChange={setHandicapPrivacy}
            />

            <ProfileField
              label="Home golf club"
              value={homeGolfClub}
              onChange={setHomeGolfClub}
              placeholder="e.g. Golfclub Basel"
              privacy={homeGolfClubPrivacy}
              onPrivacyChange={setHomeGolfClubPrivacy}
            />

            <ProfileField
              label="Golf slogan"
              value={golfSlogan}
              onChange={setGolfSlogan}
              placeholder="e.g. Play more, worry less"
              privacy={golfSloganPrivacy}
              onPrivacyChange={setGolfSloganPrivacy}
            />

            <ProfileField
              label="Favorite golf destination"
              value={favoriteGolfDestination}
              onChange={setFavoriteGolfDestination}
              placeholder="e.g. Thailand, Portugal, Scotland"
              privacy={favoriteGolfDestinationPrivacy}
              onPrivacyChange={setFavoriteGolfDestinationPrivacy}
            />
          </div>
        </Section>

        <div style={{ padding: 16 }}>
          {msg ? (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,80,80,0.12)",
                border: "1px solid rgba(255,80,80,0.25)",
                color: "var(--text)",
                fontWeight: 850,
                fontSize: 13,
              }}
            >
              {msg}
            </div>
          ) : null}

          <button
            onClick={saveProfile}
            disabled={busy}
            style={{
              padding: "13px 16px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: busy ? "var(--bg)" : "var(--text)",
              color: busy ? "var(--sub)" : "var(--bg)",
              fontWeight: 950,
              cursor: busy ? "not-allowed" : "pointer",
              width: "100%",
              fontSize: 14,
            }}
          >
            {busy ? t("profile_saving") : t("profile_save")}
          </button>
        </div>
      </div>
    </div>
  );
}
