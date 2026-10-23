import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import {
  ArrowLeft, ExternalLink, List, LocateFixed, MapPinned, Search,
} from "lucide-react";
import { getMapBasemap } from "../maps/basemap";
import { t } from "../i18n/strings";
import { getNearbyCourses, type NearbyCourse } from "../api/nearbyCourses";
import {
  getNearbyGolfServices,
  GolfServicesUnavailableError,
  type GolfServiceCategory,
  type GolfServiceVenue,
} from "../api/golfServices";

type GolfServiceDisplayVenue = GolfServiceVenue & { previewImageUrl?: string };
type NearMeCategory = GolfServiceCategory | "COURSE" | "";
type Position = { lat: number; lon: number; label: string };
type Radius = 10 | 25 | 50 | 100;
type SearchStatus = "idle" | "loading" | "ready" | "preview" | "not-deployed" | "unavailable" | "error";

const BASEL: Position = { lat: 47.5596, lon: 7.5886, label: t("golf_near_me_basel_pilot") };
const RADII: Radius[] = [10, 25, 50, 100];
const CATEGORIES: { value: NearMeCategory; label: string }[] = [
  { value: "", label: t("golf_near_me_all_services") },
  { value: "COURSE", label: t("golf_near_me_courses") },
  { value: "SIMULATOR", label: t("golf_near_me_simulators") },
  { value: "ACADEMY", label: t("golf_near_me_lessons_pros") },
  { value: "RANGE", label: t("golf_near_me_driving_ranges") },
  { value: "SHOP", label: t("golf_near_me_golf_shops") },
  { value: "FITTING", label: t("golf_near_me_club_fitting") },
];
const CATEGORY_LABEL: Record<GolfServiceCategory, string> = {
  SIMULATOR: t("golf_near_me_simulators"),
  ACADEMY: t("golf_near_me_lessons_pros"),
  RANGE: t("golf_near_me_driving_ranges"),
  SHOP: t("golf_near_me_golf_shops"),
  FITTING: t("golf_near_me_club_fitting"),
};
const panel: CSSProperties = {
  padding: 18,
  borderRadius: 22,
  border: "1px solid var(--border)",
  background: "var(--card)",
};
const subtle: CSSProperties = { color: "var(--sub)", fontSize: 13, lineHeight: 1.5 };
const chip: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  background: "var(--card)",
  color: "var(--text)",
  padding: "9px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};
const basemap = getMapBasemap();

function safeUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon]); }, [lat, lon, map]);
  return null;
}

function WebsitePreviewPhoto({ src, venueName, website }: {
  src: string;
  venueName: string;
  website: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const websiteLink = safeUrl(website);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {failed ? (
        <div style={{
          ...subtle, padding: 16, borderRadius: 14, border: "1px dashed var(--border)",
          background: "var(--bg)",
        }}>
          {t("golf_near_me_website_photo_unavailable")}
        </div>
      ) : (
        <a href={websiteLink ?? src} target="_blank" rel="noopener noreferrer"
          aria-label={venueName} style={{ display: "block", borderRadius: 14, overflow: "hidden" }}>
          <img src={src} alt={venueName} loading="lazy"
            onError={() => setFailed(true)}
            style={{
              display: "block", width: "100%", height: "clamp(170px, 24vw, 260px)",
              objectFit: "cover", objectPosition: "center",
              background: "var(--bg)",
            }} />
        </a>
      )}
      <span style={{ ...subtle, fontSize: 11 }}>
        {t("golf_near_me_website_photo_source")}
        {websiteLink ? (
          <> · <a href={websiteLink} target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--green)" }}>thegolflounge.ch <ExternalLink size={11} style={{ verticalAlign: "middle" }} /></a></>
        ) : null}
      </span>
    </div>
  );
}

function VenueCard({
  venue, selected, onSelect, isDraft = false,
}: {
  venue: GolfServiceDisplayVenue;
  selected: boolean;
  onSelect: () => void;
  isDraft?: boolean;
}) {
  const website = safeUrl(venue.website);
  const location = [
    [venue.addressLine, venue.postalCode].filter(Boolean).join(", "),
    venue.city,
    venue.country,
  ].filter(Boolean).join(" · ");

  return (
    <article style={{ ...panel, padding: 16, display: "grid", gap: 10 }}>
      {isDraft && venue.previewImageUrl ? (
        <WebsitePreviewPhoto src={venue.previewImageUrl}
          venueName={venue.name} website={venue.website} />
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        style={{ all: "unset", cursor: "pointer", display: "grid", gap: 5 }}
      >
        <span style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          <strong style={{ color: "var(--text)", fontSize: 17 }}>{venue.name}</strong>
          <strong style={{ color: "var(--green)", whiteSpace: "nowrap", fontSize: 13 }}>
{venue.distanceKm === null
              ? t("golf_near_me_preview_distance")
              : `${venue.distanceKm.toFixed(1)} km`}
          </strong>
        </span>
        <span style={subtle}>{location}</span>
        {isDraft ? (
          <span style={{ ...subtle, fontWeight: 800, color: "var(--danger)" }}>
            {t("golf_near_me_preview_draft")}
          </span>
        ) : null}
        <span style={{ ...subtle, fontWeight: 750, color: "var(--green)" }}>
          {selected ? t("golf_near_me_hide_details") : t("golf_near_me_view_details")}
        </span>
      </button>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {venue.offerings.map((offering) => (
          <span key={offering.id} style={{ ...chip, cursor: "default", padding: "5px 9px", fontSize: 11 }}>
            {CATEGORY_LABEL[offering.category] ?? offering.category}
            {offering.unitCount && offering.unitCount > 1 ? ` · ${offering.unitCount}` : ""}
          </span>
        ))}
      </div>
      {selected ? (
        <div style={{ display: "grid", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          {venue.offerings.map((offering) => (
            <div key={offering.id} style={{ display: "grid", gap: 3 }}>
              <strong style={{ color: "var(--text)", fontSize: 13 }}>
                {offering.label || CATEGORY_LABEL[offering.category]}
              </strong>
              {offering.description ? <span style={subtle}>{offering.description}</span> : null}
              {safeUrl(offering.bookingUrl) ? (
                <a href={safeUrl(offering.bookingUrl)!} target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontSize: 13 }}>
                  {t("golf_near_me_booking_details")} <ExternalLink size={12} style={{ verticalAlign: "middle" }} />
                </a>
              ) : null}
            </div>
          ))}
          {venue.venueProviders.map(({ role, provider }) => (
            <div key={provider.id} style={{ display: "grid", gap: 3 }}>
              <strong style={{ color: "var(--text)", fontSize: 13 }}>{provider.name}</strong>
              <span style={subtle}>{t("golf_near_me_professional")}
                {role === "GOLF_PRO" ? "" : ` · ${role.replaceAll("_", " ").toLowerCase()}`}</span>
              {safeUrl(provider.website) ? (
                <a href={safeUrl(provider.website)!} target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontSize: 13 }}>
                  {t("golf_near_me_provider_website")} <ExternalLink size={12} style={{ verticalAlign: "middle" }} />
                </a>
              ) : null}
            </div>
          ))}
          {website ? (
            <a href={website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontWeight: 750, fontSize: 13 }}>
              {t("golf_near_me_venue_website")} <ExternalLink size={12} style={{ verticalAlign: "middle" }} />
            </a>
          ) : null}
          {venue.phone ? <span style={subtle}>{t("phone")}: {venue.phone}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

function CourseCard({ course }: { course: NearbyCourse }) {
  const location = [course.postalCode, course.city, course.region, course.country]
    .filter(Boolean).join(" · ");
  return (
    <article style={{ ...panel, padding: 16, display: "grid", gap: 8 }}>
      <span style={{ ...subtle, fontWeight: 800, color: "var(--green)" }}>
        {t("golf_near_me_course")}
      </span>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong style={{ fontSize: 17 }}>{course.name}</strong>
        <strong style={{ color: "var(--green)", whiteSpace: "nowrap", fontSize: 13 }}>
          {(course.distanceM / 1000).toFixed(1)} km
        </strong>
      </div>
      {location ? <span style={subtle}>{location}</span> : null}
      <Link to={`/courses/${encodeURIComponent(course.id)}`}
        style={{ color: "var(--green)", fontWeight: 800, fontSize: 13 }}>
        {t("golf_near_me_open_course")} →
      </Link>
    </article>
  );
}

export default function GolfNearMePage() {
  const [origin, setOrigin] = useState<Position>(BASEL);
  const [radius, setRadius] = useState<Radius>(25);
  const [category, setCategory] = useState<NearMeCategory>("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [items, setItems] = useState<GolfServiceDisplayVenue[]>([]);
  const [courseItems, setCourseItems] = useState<NearbyCourse[]>([]);
  const [partialWarning, setPartialWarning] = useState<"services" | "courses" | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const currentRequest = useRef<AbortController | null>(null);

  useEffect(() => () => { currentRequest.current?.abort(); }, []);

  function invalidateResults() {
    currentRequest.current?.abort();
    setStatus("idle");
    setItems([]);
    setCourseItems([]);
    setPartialWarning(null);
    setSelectedId(null);
    setTruncated(false);
    setError("");
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError(t("golf_near_me_geo_unsupported"));
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        invalidateResults();
        setLocationError("");
        setOrigin({ lat: coords.latitude, lon: coords.longitude, label: t("your_location") });
        setLocating(false);
      },
      () => {
        setLocationError(t("golf_near_me_geo_denied"));
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 },
    );
  }

  async function previewBaselDraft() {
    // Display-only fixture for the local Vite dev server.
    // This code path must never be available in preview/production builds.
    if (!import.meta.env.DEV) return;
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    const { baselPilotPreview } = await import("../data/golfNearMeBaselPreview");
    if (controller.signal.aborted) return;
    setOrigin(BASEL);
    setItems(category === "COURSE" ? [] : baselPilotPreview(category));
    setTruncated(false);
    setCourseItems([]);
    setPartialWarning(null);
    setSelectedId(null);
    setStatus("preview");
    setView("list");
    setError("");
    setLocationError("");
  }

  async function searchNearby() {
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    setStatus("loading");
    setItems([]);
    setCourseItems([]);
    setPartialWarning(null);
    setSelectedId(null);
    setTruncated(false);
    setError("");

    const wantsCourses = category === "" || category === "COURSE";
    const wantsServices = category !== "COURSE";

    // Courses and services remain independent: unavailable services do not hide courses.
    const [coursesResult, servicesResult] = await Promise.all([
      wantsCourses
        ? getNearbyCourses({ lat: origin.lat, lon: origin.lon, radiusKm: radius }, controller.signal)
            .then((data) => ({ data, error: null as unknown }))
            .catch((error: unknown) => ({ data: null, error }))
        : Promise.resolve(null),
      wantsServices
        ? getNearbyGolfServices({
            lat: origin.lat, lon: origin.lon, radiusKm: radius,
            category: category === "" ? undefined : category,
          }, controller.signal)
            .then((data) => ({ data, error: null as unknown }))
            .catch((error: unknown) => ({ data: null, error }))
        : Promise.resolve(null),
    ]);

    if (controller.signal.aborted) return;

    if (coursesResult?.data) setCourseItems(coursesResult.data.items);
    if (servicesResult?.data) {
      setItems(servicesResult.data.items);
      setTruncated(servicesResult.data.truncated);
    }

    const courseSuccess = !!coursesResult?.data;
    const serviceSuccess = !!servicesResult?.data;
    if (courseSuccess || serviceSuccess) {
      if (wantsCourses && !courseSuccess) setPartialWarning("courses");
      else if (wantsServices && !serviceSuccess) setPartialWarning("services");
      setStatus("ready");
    } else if (wantsServices && servicesResult?.error instanceof GolfServicesUnavailableError) {
      setStatus(servicesResult.error.reason);
    } else {
      setError(wantsCourses && !wantsServices
        ? t("golf_near_me_courses_error")
        : t("golf_near_me_error_body"));
      setStatus("error");
    }
  }

  const validMarkers = items.filter((item) =>
    item.lat !== null && item.lon !== null &&
    Number.isFinite(item.lat) && Number.isFinite(item.lon),
  );

  const allResults = [
    ...courseItems.map((course) => ({
      kind: "course" as const, id: `course-${course.id}`,
      km: course.distanceM / 1000, course,
    })),
    ...items.map((venue) => ({
      kind: "venue" as const, id: `venue-${venue.id}`,
      km: venue.distanceKm ?? Number.POSITIVE_INFINITY, venue,
    })),
  ].sort((a, b) => a.km - b.km);

  return (
    <div className="fw-page" style={{ color: "var(--text)" }}>
      <div className="fw-page-shell" style={{
        width: "100%", maxWidth: 1100, margin: "0 auto",
        padding: "16px 14px 110px", display: "grid", gap: 18,
        boxSizing: "border-box", minWidth: 0,
      }}>
        <Link to="/destinations" style={{ ...subtle, display: "inline-flex", gap: 7, alignItems: "center", textDecoration: "none" }}>
          <ArrowLeft size={16} /> {t("explore")}
        </Link>

        <header style={{ ...panel, padding: "24px 20px", background:
          "linear-gradient(120deg, color-mix(in srgb, var(--green) 14%, var(--card)), var(--card) 74%)" }}>
          <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: "0.12em", color: "var(--green)", textTransform: "uppercase" }}>
            {t("golf_near_me_eyebrow")}
          </div>
          <h1 style={{ fontSize: "clamp(27px, 5vw, 42px)", letterSpacing: "-0.045em", lineHeight: 1.1, margin: "10px 0" }}>
            {t("golf_near_me_title")}
          </h1>
          <p style={{ ...subtle, maxWidth: 620, margin: 0 }}>
            {t("golf_near_me_intro")}
          </p>
        </header>

        <section style={{ ...panel, display: "grid", gap: 15 }} aria-label={t("golf_near_me_search_area")}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 3 }}>
              <strong style={{ fontSize: 15 }}>{t("golf_near_me_search_area")}</strong>
              <span style={subtle}><MapPinned size={14} style={{ verticalAlign: "middle" }} /> {origin.label}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={chip} disabled={locating} onClick={useMyLocation}>
                <LocateFixed size={15} style={{ verticalAlign: "middle" }} />
                {" "}{locating ? t("golf_near_me_locating") : t("golf_near_me_my_location")}
              </button>
              <button type="button" style={chip} onClick={() => { invalidateResults(); setLocationError(""); setOrigin(BASEL); }}>
                {t("golf_near_me_basel_pilot")}
              </button>
            </div>
          </div>

          {locationError ? <p role="alert" style={{ ...subtle, color: "var(--danger)", margin: 0 }}>{locationError}</p> : null}

          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: 13 }}>{t("golf_near_me_distance")}</strong>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {RADII.map((value) => (
                <button type="button" key={value} onClick={() => { invalidateResults(); setRadius(value); }}
                  aria-pressed={radius === value}
                  style={{ ...chip, borderColor: radius === value ? "var(--green)" : "var(--border)",
                    background: radius === value ? "color-mix(in srgb, var(--green) 12%, var(--card))" : "var(--card)" }}>
                  {value} km
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: 13 }}>{t("golf_near_me_looking_for")}</strong>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {CATEGORIES.map((item) => (
                <button type="button" key={item.value || "ALL"} aria-pressed={category === item.value}
                  onClick={() => { invalidateResults(); setCategory(item.value); }}
                  style={{ ...chip, borderColor: category === item.value ? "var(--green)" : "var(--border)",
                    background: category === item.value ? "color-mix(in srgb, var(--green) 12%, var(--card))" : "var(--card)" }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => void searchNearby()} disabled={status === "loading" || locating}
            style={{
              background: "var(--green)", color: "white", border: 0, borderRadius: 14,
              padding: "14px 18px", fontWeight: 850, fontSize: 14,
              cursor: status === "loading" ? "wait" : "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            <Search size={17} /> {status === "loading" ? t("golf_near_me_searching") : t("golf_near_me_search_button")}
          </button>
          {import.meta.env.DEV ? (
            <button
              type="button"
              onClick={() => void previewBaselDraft()}
              style={{ ...chip, width: "100%", padding: "13px", borderStyle: "dashed" }}
            >
              {t("golf_near_me_preview_button")}
            </button>
          ) : null}
          <span style={{ ...subtle, fontSize: 11 }}>
            {t("golf_near_me_privacy")}
          </span>
        </section>

        <section style={{ display: "grid", gap: 12 }} aria-live="polite">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: 20, margin: "0 0 3px" }}>{t("golf_near_me_nearby")}</h2>
              <div style={subtle}>
                {status === "ready"
                  ? `${items.length} ${t(items.length === 1 ? "golf_near_me_verified_venue" : "golf_near_me_verified_venues")}`
                  : status === "preview"
                    ? `${items.length} ${t("golf_near_me_preview_count")}`
                    : t("golf_near_me_verified_only")}
                {truncated ? ` · ${t("golf_near_me_showing_first")}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} style={{
                ...chip, borderColor: view === "list" ? "var(--green)" : "var(--border)",
              }}><List size={15} style={{ verticalAlign: "middle" }} /> {t("golf_near_me_list")}</button>
              <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")} style={{
                ...chip, borderColor: view === "map" ? "var(--green)" : "var(--border)",
              }}><MapPinned size={15} style={{ verticalAlign: "middle" }} /> {t("map")}</button>
            </div>
          </div>

          {status === "preview" ? (
            <div role="note" style={{
              ...panel, display: "grid", gap: 5,
              background: "color-mix(in srgb, var(--danger) 6%, var(--card))",
              borderColor: "color-mix(in srgb, var(--danger) 35%, var(--border))",
            }}>
              <strong>{t("golf_near_me_preview_title")}</strong>
              <span style={subtle}>{t("golf_near_me_preview_body")}</span>
            </div>
          ) : null}

          {status !== "ready" && status !== "preview" ? (
            <div style={{ ...panel, display: "grid", gap: 6 }}>
              <strong>
                {status === "loading" ? t("golf_near_me_loading_title") :
                  status === "not-deployed" ? t("golf_near_me_missing_title") :
                  status === "unavailable" ? t("golf_near_me_unavailable_title") :
                  status === "error" ? t("golf_near_me_error_title") :
                  t("golf_near_me_initial_title")}
              </strong>
              <span style={subtle}>
                {status === "not-deployed"
                  ? t("golf_near_me_missing_body")
                  : status === "unavailable"
                    ? t("golf_near_me_unavailable_body")
                    : status === "error"
                    ? error
                    : status === "loading"
                      ? t("golf_near_me_loading_body")
                      : t("golf_near_me_initial_body")}
              </span>
            </div>
          ) : items.length === 0 ? (
            <div style={panel}>
              <strong>{status === "preview"
                ? t("golf_near_me_preview_empty")
                : t("golf_near_me_empty_title")}</strong>
              {status === "preview" ? null : <p style={subtle}>{t("golf_near_me_empty_body")}</p>}
            </div>
          ) : view === "list" ? (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((venue) => (
                <VenueCard key={venue.id} venue={venue} selected={selectedId === venue.id}
                  isDraft={status === "preview"}
                  onSelect={() => setSelectedId((id) => id === venue.id ? null : venue.id)} />
              ))}
            </div>
          ) : null}

          {view === "map" ? (
            <div style={{ ...panel, padding: 6, overflow: "hidden" }}>
              <MapContainer center={[origin.lat, origin.lon]} zoom={11}
                scrollWheelZoom={false} style={{ width: "100%", height: 390, borderRadius: 18 }}>
                <TileLayer attribution={basemap.attribution} url={basemap.url} />
                <RecenterMap lat={origin.lat} lon={origin.lon} />
                <CircleMarker center={[origin.lat, origin.lon]} radius={8} pathOptions={{
                  color: "#2058a8", fillColor: "#4a8bf0", fillOpacity: 0.85,
                }}>
                  <Popup>{origin.label}</Popup>
                </CircleMarker>
                {validMarkers.map((venue) => (
                  <CircleMarker key={venue.id} center={[venue.lat!, venue.lon!]} radius={10}
                    pathOptions={{ color: "#165d36", fillColor: "#2e9d5f", fillOpacity: 0.9 }}>
                    <Popup>
                      <strong>{venue.name}</strong>
                      {venue.distanceKm !== null ? (
                        <div>{venue.distanceKm.toFixed(1)} km {t("golf_near_me_away")}</div>
                      ) : null}
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
              {status === "preview" ? (
                <p style={{ ...subtle, padding: "0 12px" }}>{t("golf_near_me_preview_no_coords")}</p>
              ) : status === "ready" && validMarkers.length !== items.length ? (
                <p style={{ ...subtle, padding: "0 12px" }}>{t("golf_near_me_no_map_coordinates")}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
