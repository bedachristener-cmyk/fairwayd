import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api/base";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type CountryItem = {
  country: string;
  courseCount: number;
  id?: string;
  code?: string;
  name?: string;
  slug?: string;
  followerCount?: number;
};

type DestinationApiItem = {
  id: string;
  code: string;
  name: string;
  slug: string;
  courseCount?: number;
  followerCount?: number;
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
  const { token, logout } = useAuth();
  const [items, setItems] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [followedDestinationSlugs, setFollowedDestinationSlugs] = useState<
    string[]
  >([]);
  const [destinationFollowBusySlug, setDestinationFollowBusySlug] = useState<
    string | null
  >(null);

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
            followerCount: item.followerCount || 0,
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

  useEffect(() => {
    if (items.length === 0) return;

    // Delay execution until next tick to ensure function is initialized
    const run = async () => {
      await loadFollowedDestinations();
    };

    run();
  }, [items.length]);

  const totalCourses = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.courseCount || 0), 0);
  }, [items]);

  const loadFollowedDestinations = useCallback(async () => {
    if (!token) {
      setFollowedDestinationSlugs([]);
      return;
    }

    try {
      const results = await Promise.all(
        items.map(async (item) => {
          const slug = item.slug || item.country;

          try {
            const res = await fetch(
              `${API_BASE}/destinations/${slug}/follow-status`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (res.status === 401 || res.status === 403) {
              logout();
              return null;
            }

            if (!res.ok) {
              return null;
            }

            const json = await res.json();

            if (typeof json?.followerCount === "number") {
              setItems((prev) =>
                prev.map((entry) =>
                  (entry.slug || entry.country) === slug
                    ? { ...entry, followerCount: json.followerCount }
                    : entry,
                ),
              );
            }

            return json?.following ? slug : null;
          } catch {
            return null;
          }
        }),
      );

      setFollowedDestinationSlugs(
        results.filter(
          (slug): slug is string => typeof slug === "string" && slug.length > 0,
        ),
      );
    } catch (err) {
      console.error("Failed to load followed destinations", err);
      setFollowedDestinationSlugs([]);
    }
  }, [items, token, logout]);
  const handleToggleDestinationFollow = useCallback(
    async (item: CountryItem) => {
      const slug = item.slug || item.country;
      if (!slug) return;
      if (destinationFollowBusySlug) return;

      if (!token) {
        nav("/");
        return;
      }

      const currentlyFollowing = followedDestinationSlugs.includes(slug);

      try {
        setDestinationFollowBusySlug(slug);

        setFollowedDestinationSlugs((prev) =>
          currentlyFollowing
            ? prev.filter((entry) => entry !== slug)
            : prev.includes(slug)
              ? prev
              : [...prev, slug],
        );

        setItems((prev) =>
          prev.map((entry) =>
            (entry.slug || entry.country) === slug
              ? {
                  ...entry,
                  followerCount: currentlyFollowing
                    ? Math.max(0, (entry.followerCount || 0) - 1)
                    : (entry.followerCount || 0) + 1,
                }
              : entry,
          ),
        );

        const res = await fetch(`${API_BASE}/destinations/${slug}/follow`, {
          method: currentlyFollowing ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          logout();
          throw new Error("Unauthorized");
        }

        if (!res.ok) {
          throw new Error(`Destination follow request failed: ${res.status}`);
        }

        const json = await res.json();

        if (typeof json?.following === "boolean") {
          setFollowedDestinationSlugs((prev) =>
            json.following
              ? prev.includes(slug)
                ? prev
                : [...prev, slug]
              : prev.filter((entry) => entry !== slug),
          );
        }

        if (typeof json?.followerCount === "number") {
          setItems((prev) =>
            prev.map((entry) =>
              (entry.slug || entry.country) === slug
                ? { ...entry, followerCount: json.followerCount }
                : entry,
            ),
          );
        }
      } catch (err) {
        setFollowedDestinationSlugs((prev) =>
          currentlyFollowing
            ? prev.includes(slug)
              ? prev
              : [...prev, slug]
            : prev.filter((entry) => entry !== slug),
        );

        setItems((prev) =>
          prev.map((entry) =>
            (entry.slug || entry.country) === slug
              ? {
                  ...entry,
                  followerCount: currentlyFollowing
                    ? (entry.followerCount || 0) + 1
                    : Math.max(0, (entry.followerCount || 0) - 1),
                }
              : entry,
          ),
        );

        console.error("Destination follow toggle failed", err);
      } finally {
        setDestinationFollowBusySlug(null);
      }
    },
    [token, logout, nav, destinationFollowBusySlug, followedDestinationSlugs],
  );

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: 12,
        paddingBottom: 80,
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflowX: "hidden",
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
            const slug = item.slug || item.country;
            const isFollowing = followedDestinationSlugs.includes(slug);
            const isBusy = destinationFollowBusySlug === slug;

            return (
              <div
                key={item.country}
                onClick={() => {
                  nav(`/destinations/${slug}`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  minWidth: 0,
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--text)",
                  textAlign: "left",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  overflow: "hidden",
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
                    flex: "1 1 auto",
                    display: "grid",
                    gap: 4,
                    overflow: "hidden",
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

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      fontSize: 12,
                      color: "var(--sub)",
                    }}
                  >
                    {item.courseCount > 0 ? (
                      <div>{item.courseCount} courses</div>
                    ) : null}

                    <div>{item.followerCount || 0} followers</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                    marginLeft: "auto",
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDestinationFollow(item);
                    }}
                    disabled={isBusy}
                    style={{
                      border: isFollowing ? "1px solid var(--border)" : "none",
                      background: isFollowing
                        ? "rgba(255,255,255,0.05)"
                        : "var(--text)",
                      color: isFollowing ? "var(--text)" : "var(--bg)",
                      height: 38,
                      padding: "0 14px",
                      borderRadius: 999,
                      cursor: isBusy ? "default" : "pointer",
                      fontWeight: 800,
                      fontSize: 12,
                      flexShrink: 0,
                      opacity: isBusy ? 0.7 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isBusy ? "..." : isFollowing ? "Following" : "Follow"}
                  </button>

                  <div
                    style={{
                      fontSize: 18,
                      color: "var(--sub)",
                      flexShrink: 0,
                    }}
                  >
                    ›
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
