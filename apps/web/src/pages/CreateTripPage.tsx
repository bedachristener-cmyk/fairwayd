import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  padding: "10px 12px",
  font: "inherit",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 900,
  color: "var(--text)",
};

function optionalText(value: string) {
  const text = value.trim();
  return text || undefined;
}

export default function CreateTripPage() {
  const nav = useNavigate();
  const { token } = useAuth();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!token) return;

    if (!title.trim()) {
      setErr("Title is required.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const res = await fetch(`${API_BASE}/trips`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          destination: optionalText(destination),
          description: optionalText(description),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      const trip = await res.json();
      if (!trip?.id) {
        throw new Error("Created trip response did not include an id.");
      }

      nav(`/trips/${trip.id}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create trip");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 950 }}>New Trip</div>
        <div style={{ fontSize: 13, color: "var(--sub)" }}>
          Start a golf trip plan for your group
        </div>
      </div>

      {err ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      ) : null}

      <form
        onSubmit={submit}
        style={{
          display: "grid",
          gap: 12,
          padding: 14,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <label style={labelStyle}>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Destination
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => nav("/trips")}
            disabled={saving}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor: saving ? "default" : "pointer",
              fontWeight: 900,
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--text)",
              color: "var(--bg)",
              cursor: saving ? "default" : "pointer",
              fontWeight: 900,
            }}
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
