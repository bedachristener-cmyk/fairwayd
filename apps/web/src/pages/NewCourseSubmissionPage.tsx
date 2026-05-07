import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

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

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    if (!form.name.trim() || !form.country.trim()) {
      setErr("Course name and country are required.");
      return;
    }

    try {
      setSending(true);
      setErr("");
      setDone(false);

      const res = await fetch(`${API_BASE}/course-submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Submission failed ${res.status} ${body}`);
      }

      setForm(initialForm);
      setDone(true);
    } catch (error) {
      console.error("Course submission failed", error);
      setErr("Could not send the course suggestion.");
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
          Suggest missing course
        </div>
        <div style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.45 }}>
          Send a course that is missing from Fairwayd. It will be reviewed
          before being added.
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
        {field("name", "Course name", "Real Club de Golf ...")}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
          }}
        >
          {field("country", "Country code", "ES")}
          {field("city", "City", "Palma")}
          {field("region", "Region", "Mallorca")}
        </div>
        {field("website", "Website", "https://...", "url")}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
          }}
        >
          {field("lat", "Latitude", "39.5", "number")}
          {field("lon", "Longitude", "2.6", "number")}
          {field("holes", "Holes", "18", "number")}
          {field("par", "Par", "72", "number")}
        </div>
        {field("imageUrl", "Image URL", "https://...", "url")}

        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>Notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
            placeholder="Anything that helps verify this course."
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

        {err ? <div style={{ fontSize: 13, color: "crimson" }}>{err}</div> : null}
        {done ? (
          <div style={{ fontSize: 13, color: "var(--sub)" }}>
            Suggestion submitted for review.
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
            {sending ? "Sending..." : "Submit suggestion"}
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
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
