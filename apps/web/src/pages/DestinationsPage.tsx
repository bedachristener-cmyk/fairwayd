import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api/base";
import { useNavigate } from "react-router-dom";

type CountryItem = {
  country: string;
  courseCount: number;
  id?: string;
  code?: string;
  name?: string;
  slug?: string;
};

type DestinationApiItem = {
  id: string;
  code: string;
  name: string;
  slug: string;
  courseCount?: number;
};

const COUNTRY_LABELS: Record<string, string> = {
  AT: "Austria",
  CH: "Switzerland",
  DE: "Germany",
  ES: "Spain",
  FR: "France",
  IT: "Italy",
  PT: "Portugal",
  TH: "Thailand",
  VN: "Vietnam",
};

function getCountryLabel(code: string) {
  return COUNTRY_LABELS[code] || code;
}

export default function DestinationsPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`${API_BASE}/destinations`);

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(
            `Failed to load destinations. HTTP ${res.status} ${t}`.trim(),
          );
        }

        const data = await res.json();
        console.log("destinations raw response", data);

        const source = Array.isArray(data?.items) ? data.items : [];

        const normalized: CountryItem[] = source.map(
          (item: DestinationApiItem) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            slug: item.slug,

            // bestehendes UI weiterverwenden
            country: item.slug,
            courseCount: item.courseCount || 0,
          }),
        );

        console.log("destinations normalized", normalized);
        setItems(normalized);
      } catch (e: any) {
        console.error("Failed to load destination countries", e);
        setErr(e?.message ?? "Failed to load destinations");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const totalCourses = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.courseCount || 0), 0);
  }, [items]);

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: "var(--text)",
          }}
        >
          🌍 Golf Destinations
        </div>

        <div
          style={{
            fontSize: 13,
            color: "var(--sub)",
            lineHeight: 1.5,
          }}
        >
          Discover golf by country. Start broad, then drill down into courses.
        </div>

        {!loading && !err ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--sub)",
            }}
          >
            {items.length} countries
            {totalCourses > 0 ? ` · ${totalCourses} courses` : ""}
          </div>
        ) : null}
      </div>

      {err ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "rgba(255,0,0,0.08)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          <strong>Error:</strong> {err}
        </div>
      ) : null}

      {loading ? (
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--sub)",
            fontSize: 13,
          }}
        >
          Loading destinations...
        </div>
      ) : null}

      {!loading && !err && (
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {items.map((item) => {
            const label =
              item.name || getCountryLabel(item.code || item.country);

            return (
              <button
                key={item.country}
                type="button"
                onClick={() => {
                  nav(`/destinations/${item.slug || item.country}`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--text)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--bg)",
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  {item.code || item.country}
                </div>

                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                    display: "grid",
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: "var(--text)",
                    }}
                  >
                    {label}
                  </div>

                  {item.courseCount > 0 ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--sub)",
                      }}
                    >
                      {item.courseCount} courses
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    fontSize: 18,
                    color: "var(--sub)",
                    flexShrink: 0,
                  }}
                >
                  ›
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
