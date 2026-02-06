import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n/strings"; // ⚠️ Pfad ggf. anpassen

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type CourseLite = { id: string; name: string };

export default function CourseDropdown({
  courses,
  selectedCourseId,
  onSelect,
  onClear,
  placeholder,
}: {
  courses: CourseLite[];
  selectedCourseId: string | null;
  onSelect: (courseId: string) => void;
  onClear?: () => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [remoteCourses, setRemoteCourses] = useState<CourseLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId],
  );

  const list = q.trim().length >= 2 ? remoteCourses : [];

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (!open) return;
    setQ("");
    setRemoteCourses([]);
    setActiveIndex(0);
    const tmr = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(tmr);
  }, [open]);

  // Remote search
  useEffect(() => {
    const s = q.trim();

    if (s.length < 2) {
      setRemoteCourses([]);
      setActiveIndex(0);
      return;
    }

    const tmr = window.setTimeout(async () => {
      try {
        setLoading(true);
        const r = await fetch(
          `${API_BASE}/courses/search?q=${encodeURIComponent(s)}&take=20`,
        );
        const d = await r.json();
        const items = Array.isArray(d?.items) ? d.items : [];
        setRemoteCourses(items);
        setActiveIndex((i) =>
          Math.max(0, Math.min(i, Math.max(items.length - 1, 0))),
        );
      } catch {
        setRemoteCourses([]);
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(tmr);
  }, [q]);

  function pickAt(idx: number) {
    const c = list[idx];
    if (!c) return;
    onSelect(c.id);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(list.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      pickAt(activeIndex);
      return;
    }
  }

  return (
    <div
      ref={rootRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* Chip */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          borderRadius: 999,
          border: selected
            ? "1px solid rgba(0,255,128,.45)"
            : "1px solid rgba(255,255,255,.18)",
          background: selected
            ? "linear-gradient(180deg, rgba(0,255,128,.18), rgba(0,255,128,.10))"
            : "rgba(255,255,255,.06)",
          color: "white",
          cursor: "pointer",
          userSelect: "none",
          fontWeight: 900,
          boxShadow: selected ? "0 6px 18px rgba(0,255,128,.15)" : "none",
        }}
      >
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>⛳</span>
          <span>
            {selected ? selected.name : (placeholder ?? t("course_choose"))}
          </span>
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          onKeyDown={onKeyDown}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: 360,
            maxWidth: "min(360px, 90vw)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(10,10,10,.98)",
            boxShadow: "0 20px 60px rgba(0,0,0,.55)",
            overflow: "hidden",
            zIndex: 2000,
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid rgba(255,255,255,.10)",
            }}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("course_search_placeholder")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.06)",
                color: "white",
                outline: "none",
              }}
            />

            {selectedCourseId && onClear ? (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.14)",
                  background: "transparent",
                  color: "rgba(255,255,255,.85)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {t("course_clear_selection")}
              </button>
            ) : null}
          </div>

          {/* List */}
          <div style={{ maxHeight: 320, overflow: "auto" }}>
            {q.trim().length < 2 ? (
              <div style={{ padding: 14, color: "rgba(255,255,255,.6)" }}>
                {t("course_min_chars")}
              </div>
            ) : loading ? (
              <div style={{ padding: 14, color: "rgba(255,255,255,.6)" }}>
                {t("course_searching")}
              </div>
            ) : list.length === 0 ? (
              <div style={{ padding: 14, color: "rgba(255,255,255,.75)" }}>
                {t("course_no_results")}
              </div>
            ) : (
              list.map((c, idx) => {
                const isActive = idx === activeIndex;
                const isSelected = c.id === selectedCourseId;
                return (
                  <div
                    key={c.id}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickAt(idx);
                    }}
                    style={{
                      padding: "12px 14px",
                      cursor: "pointer",
                      background: isActive
                        ? "rgba(0,255,128,.10)"
                        : "transparent",
                      borderLeft: isActive
                        ? "3px solid rgba(0,255,128,.85)"
                        : "3px solid transparent",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span>⛳</span>
                      <span>{c.name}</span>
                    </span>
                    {isSelected ? <span>✓</span> : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
