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
          🌍 {t("golf_destinations")}
        </div>

        <div
          style={{
            fontSize: 13,
            color: "var(--sub)",
            lineHeight: 1.5,
          }}
        >
          {t("destinations_subtitle")}
        </div>

        {!loading && !err ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--sub)",
            }}
          >
            {items.length}{" "}
            {items.length === 1 ? t("country_singular") : t("country_plural")}
            {totalCourses > 0 ? ` · ${totalCourses} ${t("course_plural")}` : ""}
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
          <strong>{t("error")}:</strong> {err}
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
          {t("loading_destinations")}
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
                  gap: 14,
                  width: "100%",
                  minWidth: 0,
                  padding: "16px 16px",
                  borderRadius: 20,
                  border: "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
                  background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
                  color: "var(--text)",
                  textAlign: "left",
                  cursor: "pointer",
                  boxSizing: "border-box",
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
                    width: "36px",
                    minWidth: "36px",
                    maxWidth: "36px",
                    height: "24px",
                    minHeight: "24px",
                    maxHeight: "24px",
                    objectFit: "cover",
                    borderRadius: 8,
                    flexShrink: 0,
                    alignSelf: "center",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  }}
                />

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
                      fontSize: 16,
                      lineHeight: 1.2,
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

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      fontSize: 12,
                      color: "var(--sub)",
                      lineHeight: 1.4,
                    }}
                  >
                    {item.courseCount > 0 ? (
                      <span>{item.courseCount} {t("course_plural")}</span>
                    ) : null}

                    <span>
                      {item.followerCount || 0}{" "}
                      {(item.followerCount || 0) === 1
                        ? t("follower_singular")
                        : t("follower_plural")}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0,
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
                      border: isFollowing
                        ? "1px solid var(--accent-strong)"
                        : "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
                      background: isFollowing ? "var(--accent)" : "transparent",
                      color: isFollowing ? "#f8fbf6" : "var(--text)",
                      minWidth: 90,
                      height: 34,
                      padding: "0 14px",
                      borderRadius: 999,
                      cursor: isBusy ? "default" : "pointer",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                      opacity: isBusy ? 0.7 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isBusy ? "..." : isFollowing ? t("following") : t("follow")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BackToTopButton />
      </div>
    </div>
  );
}
