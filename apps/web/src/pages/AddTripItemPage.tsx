import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

type TripItemType =
  | "golf_round"
  | "hotel"
  | "transfer"
  | "car_rental"
  | "free_day"
  | "note";

const typeOptions: { value: TripItemType; label: string }[] = [
  { value: "golf_round", label: "Golf round" },
  { value: "hotel", label: "Hotel" },
  { value: "transfer", label: "Transfer" },
  { value: "car_rental", label: "Car rental" },
  { value: "free_day", label: "Free day" },
  { value: "note", label: "Note" },
];

type CourseSearchResult = {
  id: string;
  name: string;
  country: string;
  region?: string | null;
};

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

function optionalNumber(value: string) {
  const text = value.trim();
  if (!text) return undefined;

  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

export default function AddTripItemPage() {
  const { tripId } = useParams();
  const nav = useNavigate();
  const { token } = useAuth();

  const [type, setType] = useState<TripItemType>("golf_round");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [directPrice, setDirectPrice] = useState("");
  const [providerPrice, setProviderPrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [courseResults, setCourseResults] = useState<CourseSearchResult[]>([]);
  const [selectedCourse, setSelectedCourse] =
    useState<CourseSearchResult | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function searchCourses() {
      if (type !== "golf_round") {
        setCourseQuery("");
        setCourseResults([]);
        setSelectedCourse(null);
        return;
      }

      const q = courseQuery.trim();
      if (q.length < 2) {
        setCourseResults([]);
        return;
      }

      try {
        setCourseLoading(true);

        const res = await fetch(
          `${API_BASE}/courses/search?q=${encodeURIComponent(q)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (!res.ok) {
          setCourseResults([]);
          return;
        }

        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        if (!cancelled) setCourseResults(items.slice(0, 10));
      } catch {
        if (!cancelled) setCourseResults([]);
      } finally {
        if (!cancelled) setCourseLoading(false);
      }
    }

    searchCourses();

    return () => {
      cancelled = true;
    };
  }, [courseQuery, token, type]);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!tripId || !token) return;

    if (!type || !title.trim() || !date) {
      setErr("Type, title, and date are required.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const payload = {
        type,
        title: title.trim(),
        date,
        startTime: optionalText(startTime),
        provider: optionalText(provider),
        notes: optionalText(notes),
        directPrice: optionalNumber(directPrice),
        providerPrice: optionalNumber(providerPrice),
        currency: optionalText(currency),
        courseId: type === "golf_round" ? selectedCourse?.id : undefined,
      };

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/items`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      nav(`/trips/${tripId}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to add trip item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 950 }}>Add Item</div>
        <div style={{ fontSize: 13, color: "var(--sub)" }}>
          Add a simple timeline item to this trip
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
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TripItemType)}
            required
            style={fieldStyle}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {type === "golf_round" ? (
          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>
              Search golf course
              <input
                value={courseQuery}
                onChange={(e) => {
                  setCourseQuery(e.target.value);
                  setSelectedCourse(null);
                }}
                placeholder="Search golf course"
                style={fieldStyle}
              />
            </label>

            {selectedCourse ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Selected: {selectedCourse.name}
              </div>
            ) : null}

            {courseLoading ? (
              <div style={{ color: "var(--sub)", fontSize: 13 }}>
                Searching...
              </div>
            ) : null}

            {courseResults.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 6,
                  background: "var(--bg)",
                }}
              >
                {courseResults.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      setSelectedCourse(course);
                      setCourseQuery(course.name);
                      setCourseResults([]);
                    }}
                    style={{
                      textAlign: "left",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      background: "var(--card)",
                      color: "var(--text)",
                      padding: "10px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{course.name}</div>
                    <div style={{ color: "var(--sub)", fontSize: 12 }}>
                      {[course.region, course.country].filter(Boolean).join(", ")}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

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
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Start time
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Provider
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Direct price
          <input
            type="number"
            inputMode="decimal"
            value={directPrice}
            onChange={(e) => setDirectPrice(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Provider price
          <input
            type="number"
            inputMode="decimal"
            value={providerPrice}
            onChange={(e) => setProviderPrice(e.target.value)}
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Currency
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="CHF"
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => nav(`/trips/${tripId}`)}
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
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
