import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api/base";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import BackToTopButton from "../components/BackToTopButton";
import { t } from "../i18n/strings";

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
  JP: "Japan",
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
    <div className="fw-page">
      <div className="fw-page-atmosphere" aria-hidden="true">
        <div className="fw-page-atmosphere-overlay" />
      </div>

      <div
        className="fw-page-shell"
        style={{
          display: "grid",
          gap: 14,
          padding: "12px 12px 88px",
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <section
          style={{
            position: "relative",
            display: "grid",
            gap: 14,
            padding: "20px 18px 18px",
            borderRadius: 28,
            border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--card) 94%, var(--green) 6%), color-mix(in srgb, var(--card) 92%, var(--bg) 8%))",
            boxShadow: "0 18px 44px rgba(0,0,0,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: -44,
              top: -56,
              width: 150,
              height: 150,
              borderRadius: 999,
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--green) 24%, transparent), transparent 68%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", display: "grid", gap: 7 }}>
            <div
              style={{
                width: "fit-content",
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                background: "color-mix(in srgb, var(--muted) 82%, transparent)",
                color: "var(--sub)",
                fontSize: 11,
                fontWeight: 850,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Discovery
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                lineHeight: 1.05,
                fontWeight: 850,
                letterSpacing: "-0.045em",
                color: "var(--text)",
              }}
            >
              Explore golf destinations
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 520,
                color: "var(--sub)",
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              Find countries shaped by memorable courses, travel inspiration and
              golf communities worth following.
            </p>
          </div>

          {!loading && !err ? (
            <div
              style={{
                position: "relative",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 30,
                  padding: "0 12px",
                  borderRadius: 999,
                  border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
                  background: "color-mix(in srgb, var(--muted) 78%, transparent)",
                  color: "var(--text)",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {items.length} {items.length === 1 ? t("country_singular") : t("country_plural")}
              </span>

              {totalCourses > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 30,
                    padding: "0 12px",
                    borderRadius: 999,
                    border: "1px solid color-mix(in srgb, var(--green) 34%, var(--border))",
                    background: "color-mix(in srgb, var(--green) 12%, var(--muted))",
                    color: "var(--text)",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {totalCourses} {t("course_plural")}
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        {err ? (
          <div
            style={{
              padding: 16,
              borderRadius: 22,
              border: "1px solid color-mix(in srgb, #ef4444 32%, var(--border))",
              background: "color-mix(in srgb, #ef4444 9%, var(--card))",
              color: "var(--text)",
              fontSize: 13,
              lineHeight: 1.45,
              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            }}
          >
            <strong>{t("error")}:</strong> {err}
          </div>
        ) : null}

        {loading ? (
          <div
            style={{
              display: "grid",
              gap: 6,
              padding: 18,
              borderRadius: 24,
              border: "1px solid color-mix(in srgb, var(--border) 76%, transparent)",
              background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
              color: "var(--text)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 850 }}>
              {t("loading_destinations")}
            </div>
            <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
              Preparing your next golf travel shortlist.
            </div>
          </div>
        ) : null}

        {!loading && !err && items.length === 0 ? (
          <div
            style={{
              display: "grid",
              gap: 6,
              padding: 18,
              borderRadius: 24,
              border: "1px solid color-mix(in srgb, var(--border) 76%, transparent)",
              background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
              color: "var(--text)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 850 }}>
              No destinations yet
            </div>
            <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
              New golf destinations will appear here once they are available.
            </div>
          </div>
        ) : null}

        {!loading && !err && items.length > 0 ? (
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
                    gap: 13,
                    width: "100%",
                    minWidth: 0,
                    padding: 14,
                    borderRadius: 24,
                    border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--card) 96%, var(--bg) 4%), color-mix(in srgb, var(--card) 90%, var(--green) 4%))",
                    color: "var(--text)",
                    textAlign: "left",
                    cursor: "pointer",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    boxShadow: "0 12px 28px rgba(0,0,0,0.075)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 52,
                      height: 52,
                      minWidth: 52,
                      borderRadius: 18,
                      border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                      background: "color-mix(in srgb, var(--muted) 78%, transparent)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.20)",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${(
                        item.code ||
                        item.country ||
                        ""
                      ).toLowerCase()}.png`}
                      alt={item.code}
                      style={{
                        display: "block",
                        width: 34,
                        height: 24,
                        objectFit: "cover",
                        borderRadius: 7,
                        boxShadow: "0 2px 7px rgba(0,0,0,0.18)",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      minWidth: 0,
                      flex: "1 1 auto",
                      display: "grid",
                      gap: 7,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 850,
                          fontSize: 16,
                          lineHeight: 1.15,
                          letterSpacing: "-0.018em",
                          color: "var(--text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {label}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--sub)",
                          lineHeight: 1.35,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t("destination_card_subtitle")}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        lineHeight: 1.2,
                      }}
                    >
                      {item.courseCount > 0 ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            minHeight: 24,
                            padding: "0 9px",
                            borderRadius: 999,
                            border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                            background: "color-mix(in srgb, var(--muted) 80%, transparent)",
                            color: "var(--text)",
                            fontSize: 11,
                            fontWeight: 750,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.courseCount} {t("course_plural")}
                        </span>
                      ) : null}

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          minHeight: 24,
                          padding: "0 9px",
                          borderRadius: 999,
                          border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                          background: "color-mix(in srgb, var(--muted) 80%, transparent)",
                          color: "var(--sub)",
                          fontSize: 11,
                          fontWeight: 750,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.followerCount || 0}{" "}
                        {(item.followerCount || 0) === 1
                          ? t("follower_singular")
                          : t("follower_plural")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDestinationFollow(item);
                    }}
                    disabled={isBusy}
                    style={{
                      border: isFollowing
                        ? "1px solid color-mix(in srgb, var(--green) 48%, var(--border))"
                        : "1px solid color-mix(in srgb, var(--green) 72%, var(--border))",
                      background: isFollowing
                        ? "color-mix(in srgb, var(--green) 13%, var(--muted))"
                        : "var(--green)",
                      color: isFollowing ? "var(--text)" : "#fff",
                      minWidth: 86,
                      height: 36,
                      padding: "0 14px",
                      borderRadius: 999,
                      cursor: isBusy ? "default" : "pointer",
                      fontWeight: 850,
                      fontSize: 12,
                      flexShrink: 0,
                      opacity: isBusy ? 0.72 : 1,
                      whiteSpace: "nowrap",
                      boxShadow: isFollowing
                        ? "none"
                        : "0 8px 18px color-mix(in srgb, var(--green) 30%, transparent)",
                    }}
                  >
                    {isBusy ? "..." : isFollowing ? t("following") : t("follow")}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        <BackToTopButton />
      </div>
    </div>
  );
}
