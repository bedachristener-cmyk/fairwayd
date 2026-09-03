import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { t } from "../i18n/strings";

type FormState = {
  name: string;
  country: string;
  city: string;
  region: string;
  website: string;
  lat: string;
  lon: string;
  holes: string;
  par: string;
  imageUrl: string;
  notes: string;
};

const initialForm: FormState = {
  name: "",
  country: "",
  city: "",
  region: "",
  website: "",
  lat: "",
  lon: "",
  holes: "",
  par: "",
  imageUrl: "",
  notes: "",
};

const maxImages = 5;
const maxImageSize = 5 * 1024 * 1024;

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function NewCourseSubmissionPage() {
  const nav = useNavigate();
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function handleImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);

    if (selected.length > maxImages) {
      setErr(t("course_images_help"));
      setImages([]);
      event.target.value = "";
      return;
    }

    const invalid = selected.find(
      (file) => !file.type.startsWith("image/") || file.size > maxImageSize,
    );

    if (invalid) {
      setErr(t("course_submission_images_invalid"));
      setImages([]);
      event.target.value = "";
      return;
    }

    setErr("");
    setImages(selected);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    if (!form.name.trim() || !form.country.trim()) {
      setErr(t("course_submission_required"));
      return;
    }

    try {
      setSending(true);
      setErr("");
      setDone(false);

      const payload = {
        name: form.name.trim(),
        country: form.country.trim().toUpperCase(),
        city: form.city.trim() || null,
        region: form.region.trim() || null,
        website: form.website.trim() || null,
        lat: numberOrNull(form.lat),
        lon: numberOrNull(form.lon),
        holes: numberOrNull(form.holes),
        par: numberOrNull(form.par),
        imageUrl: form.imageUrl.trim() || null,
        notes: form.notes.trim() || null,
      };

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      let body: BodyInit;

      if (images.length > 0) {
        const data = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined) data.append(key, String(value));
        });
        images.forEach((image) => data.append("images", image));
        body = data;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(payload);
      }

      const res = await fetch(`${API_BASE}/course-submissions`, {
        method: "POST",
        headers,
        body,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Submission failed ${res.status} ${body}`);
      }

      setForm(initialForm);
      setImages([]);
      setFileInputKey((value) => value + 1);
      setDone(true);
    } catch (error) {
      console.error("Course submission failed", error);
      setErr(t("course_submission_failed"));
    } finally {
      setSending(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    padding: "0 12px",
    boxSizing: "border-box",
    fontSize: 14,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 800,
    color: "var(--text)",
  };

  const field = (
    key: keyof FormState,
    label: string,
    placeholder?: string,
    type = "text",
  ) => (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <input
        value={form[key]}
        onChange={(event) => setField(key, event.target.value)}
        placeholder={placeholder}
        type={type}
        style={inputStyle}
      />
    </label>
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        padding: "16px 12px 80px",
        boxSizing: "border-box",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            lineHeight: 1.1,
            color: "var(--text)",
          }}
        >
          {t("suggest_missing_course")}
        </div>
        <div style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.45 }}>
          {t("course_submission_help")}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 12,
          border: "1px solid var(--border)",
          background: "var(--card)",
          borderRadius: 16,
          padding: 14,
        }}
      >
        {field("name", t("course_name"), "Real Club de Golf ...")}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          {field("country", t("country_code"), "ES")}
          {field("city", t("city"), "Palma")}
          {field("region", t("region"), "Mallorca")}
        </div>
        {field("website", "Website", "https://...", "url")}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
          }}
        >
          {field("lat", t("latitude"), "39.5", "number")}
          {field("lon", t("longitude"), "2.6", "number")}
          {field("holes", t("holes"), "18", "number")}
          {field("par", t("par"), "72", "number")}
        </div>
        {field("imageUrl", t("image_url"), "https://...", "url")}

        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>{t("course_images")}</span>
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImagesChange}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              padding: "10px 12px",
              boxSizing: "border-box",
              fontSize: 14,
            }}
          />
          <span style={{ fontSize: 12, color: "var(--sub)" }}>
            {t("course_images_help")}
          </span>
        </label>

        {previews.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
              gap: 8,
            }}
          >
            {previews.map((preview, index) => (
              <img
                key={preview}
                src={preview}
                alt={`Selected course upload ${index + 1}`}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              />
            ))}
          </div>
        ) : null}

        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>{t("notes")}</span>
          <textarea
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
            placeholder={t("course_submission_notes_placeholder")}
            rows={5}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              padding: "12px",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          />
        </label>

        {err ? (
          <div style={{ fontSize: 13, color: "crimson" }}>{err}</div>
        ) : null}
        {done ? (
          <div style={{ fontSize: 13, color: "var(--sub)" }}>
            {t("course_submission_sent")}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={sending}
            style={{
              border: "1px solid var(--border)",
              background: "var(--text)",
              color: "var(--bg)",
              borderRadius: 12,
              padding: "11px 14px",
              fontSize: 14,
              fontWeight: 800,
              cursor: sending ? "default" : "pointer",
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? t("sending") : t("submit_suggestion")}
          </button>
          <button
            type="button"
            onClick={() => nav(-1)}
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              borderRadius: 12,
              padding: "11px 14px",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {t("back")}
          </button>
        </div>
      </form>
    </div>
  );
}
