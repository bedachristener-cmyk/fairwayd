import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import {
  ArrowLeft, ExternalLink, List, LocateFixed, MapPinned, Search,
} from "lucide-react";
import { getMapBasemap } from "../maps/basemap";
import {
  getNearbyGolfServices,
  GolfServicesUnavailableError,
  type GolfServiceCategory,
  type GolfServiceVenue,
} from "../api/golfServices";

type Position = { lat: number; lon: number; label: string };
type Radius = 10 | 25 | 50 | 100;
type SearchStatus = "idle" | "loading" | "ready" | "not-deployed" | "unavailable" | "error";

const BASEL: Position = { lat: 47.5596, lon: 7.5886, label: "Basel (pilot)" };
const RADII: Radius[] = [10, 25, 50, 100];
const CATEGORIES: { value: GolfServiceCategory | ""; label: string }[] = [
  { value: "", label: "All services" },
  { value: "SIMULATOR", label: "Simulators" },
  { value: "ACADEMY", label: "Lessons & pros" },
  { value: "RANGE", label: "Driving ranges" },
  { value: "SHOP", label: "Golf shops" },
  { value: "FITTING", label: "Club fitting" },
];
const CATEGORY_LABEL: Record<GolfServiceCategory, string> = {
  SIMULATOR: "Simulator",
  ACADEMY: "Lessons & coaching",
  RANGE: "Driving range",
  SHOP: "Golf shop",
  FITTING: "Club fitting",
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

function VenueCard({
  venue, selected, onSelect,
}: {
  venue: GolfServiceVenue;
  selected: boolean;
  onSelect: () => void;
}) {
  const website = safeUrl(venue.website);
  const location = [
    [venue.addressLine, venue.postalCode].filter(Boolean).join(", "),
    venue.city,
    venue.country,
  ].filter(Boolean).join(" · ");

  return (
    <article style={{ ...panel, padding: 16, display: "grid", gap: 10 }}>
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        style={{ all: "unset", cursor: "pointer", display: "grid", gap: 5 }}
      >
        <span style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          <strong style={{ color: "var(--text)", fontSize: 17 }}>{venue.name}</strong>
          <strong style={{ color: "var(--green)", whiteSpace: "nowrap", fontSize: 13 }}>
            {venue.distanceKm.toFixed(1)} km
          </strong>
        </span>
        <span style={subtle}>{location}</span>
        <span style={{ ...subtle, fontWeight: 750, color: "var(--green)" }}>
          {selected ? "Hide details −" : "View details +"}
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
                  Booking details <ExternalLink size={12} style={{ verticalAlign: "middle" }} />
                </a>
              ) : null}
            </div>
          ))}
          {venue.venueProviders.map(({ role, provider }) => (
            <div key={provider.id} style={{ display: "grid", gap: 3 }}>
              <strong style={{ color: "var(--text)", fontSize: 13 }}>{provider.name}</strong>
              <span style={subtle}>Golf professional · {role.replaceAll("_", " ").toLowerCase()}</span>
              {safeUrl(provider.website) ? (
                <a href={safeUrl(provider.website)!} target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontSize: 13 }}>
                  Provider website <ExternalLink size={12} style={{ verticalAlign: "middle" }} />
                </a>
              ) : null}
            </div>
          ))}
          {website ? (
            <a href={website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontWeight: 750, fontSize: 13 }}>
              Visit venue website <ExternalLink size={12} style={{ verticalAlign: "middle" }} />
            </a>
          ) : null}
          {venue.phone ? <span style={subtle}>Phone: {venue.phone}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

export default function GolfNearMePage() {
  const [origin, setOrigin] = useState<Position>(BASEL);
  const [radius, setRadius] = useState<Radius>(25);
  const [category, setCategory] = useState<GolfServiceCategory | "">("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState("");
  const [items, setItems] = useState<GolfServiceVenue[]>([]);
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
    setSelectedId(null);
    setTruncated(false);
    setError("");
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location services.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        invalidateResults();
        setOrigin({ lat: coords.latitude, lon: coords.longitude, label: "Your location" });
        setLocating(false);
      },
      () => {
        setError("Location was unavailable or permission was denied. You can still try the Basel pilot.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 },
    );
  }

  async function searchNearby() {
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    setStatus("loading");
    setItems([]);
    setSelectedId(null);
    setTruncated(false);
    setError("");
    try {
      const data = await getNearbyGolfServices({
        lat: origin.lat, lon: origin.lon, radiusKm: radius,
        category: category || undefined,
      }, controller.signal);
      if (controller.signal.aborted) return;
      setItems(data.items);
      setTruncated(data.truncated);
      setStatus("ready");
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof GolfServicesUnavailableError) {
        setStatus(cause.reason);
      } else {
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "Unable to load nearby services.");
      }
    }
  }

  const validMarkers = items.filter((item) =>
    item.lat !== null && item.lon !== null &&
    Number.isFinite(item.lat) && Number.isFinite(item.lon),
  );

  return (
    <div className="fw-page" style={{ color: "var(--text)" }}>
      <div className="fw-page-shell" style={{
        width: "100%", maxWidth: 1100, margin: "0 auto",
        padding: "16px 14px 110px", display: "grid", gap: 18,
        boxSizing: "border-box", minWidth: 0,
      }}>
        <Link to="/destinations" style={{ ...subtle, display: "inline-flex", gap: 7, alignItems: "center", textDecoration: "none" }}>
          <ArrowLeft size={16} /> Explore
        </Link>

        <header style={{ ...panel, padding: "24px 20px", background:
          "linear-gradient(120deg, color-mix(in srgb, var(--green) 14%, var(--card)), var(--card) 74%)" }}>
          <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: "0.12em", color: "var(--green)", textTransform: "uppercase" }}>
            Local golf directory · Pilot
          </div>
          <h1 style={{ fontSize: "clamp(27px, 5vw, 42px)", letterSpacing: "-0.045em", lineHeight: 1.1, margin: "10px 0" }}>
            Golf Near Me
          </h1>
          <p style={{ ...subtle, maxWidth: 620, margin: 0 }}>
            Discover places to practice, learn and shop. One venue may offer multiple services and host independent golf professionals.
          </p>
        </header>

        <section style={{ ...panel, display: "grid", gap: 15 }} aria-label="Nearby search">
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 3 }}>
              <strong style={{ fontSize: 15 }}>Search area</strong>
              <span style={subtle}><MapPinned size={14} style={{ verticalAlign: "middle" }} /> {origin.label}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={chip} disabled={locating} onClick={useMyLocation}>
                <LocateFixed size={15} style={{ verticalAlign: "middle" }} />
                {" "}{locating ? "Finding location…" : "Use my location"}
              </button>
              <button type="button" style={chip} onClick={() => { invalidateResults(); setOrigin(BASEL); }}>
                Basel pilot
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: 13 }}>Distance</strong>
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
            <strong style={{ fontSize: 13 }}>What are you looking for?</strong>
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
            <Search size={17} /> {status === "loading" ? "Searching…" : "Find golf services"}
          </button>
          <span style={{ ...subtle, fontSize: 11 }}>
            Location is used only for this search and is not saved. Searches can include nearby countries.
          </span>
        </section>

        <section style={{ display: "grid", gap: 12 }} aria-live="polite">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: 20, margin: "0 0 3px" }}>Nearby services</h2>
              <div style={subtle}>
                {status === "ready" ? `${items.length} verified ${items.length === 1 ? "venue" : "venues"}` : "Verified businesses only"}
                {truncated ? " · Showing first 100" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} style={{
                ...chip, borderColor: view === "list" ? "var(--green)" : "var(--border)",
              }}><List size={15} style={{ verticalAlign: "middle" }} /> List</button>
              <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")} style={{
                ...chip, borderColor: view === "map" ? "var(--green)" : "var(--border)",
              }}><MapPinned size={15} style={{ verticalAlign: "middle" }} /> Map</button>
            </div>
          </div>

          {status !== "ready" ? (
            <div style={{ ...panel, display: "grid", gap: 6 }}>
              <strong>
                {status === "loading" ? "Finding services…" :
                  status === "not-deployed" ? "Directory API not deployed yet" :
                  status === "unavailable" ? "Directory currently unavailable" :
                  status === "error" ? "Search could not be completed" :
                  "Explore nearby golf services"}
              </strong>
              <span style={subtle}>
                {status === "not-deployed"
                  ? "The connected API does not provide the Golf Near Me endpoint yet. The frontend pilot can still be explored."
                  : status === "unavailable"
                    ? "The Golf Near Me directory is disabled or temporarily unavailable. No live results can be shown right now."
                    : status === "error"
                    ? error
                    : status === "loading"
                      ? "Checking verified nearby locations."
                      : "Choose a radius and a category, then search. The Basel pilot is selected by default."}
              </span>
            </div>
          ) : items.length === 0 ? (
            <div style={panel}>
              <strong>No verified venues found in this search.</strong>
              <p style={subtle}>Try a larger radius or a different category. Draft venues are intentionally not shown.</p>
            </div>
          ) : view === "list" ? (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((venue) => (
                <VenueCard key={venue.id} venue={venue} selected={selectedId === venue.id}
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
                      <div>{venue.distanceKm.toFixed(1)} km away</div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
              {status === "ready" && validMarkers.length !== items.length ? (
                <p style={{ ...subtle, padding: "0 12px" }}>Some venues have no map coordinates.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
