import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import { useAuth } from "../auth/AuthContext";
import { apiGet } from "../api/client";
import { useCourseFollow } from "../hooks/useCourseFollow";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
//import { saveRating, getMyRating, getRatingSummary } from "../api/ratings";

type Course = {
  id: string;
  name: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  website?: string | null;
  holes?: number | null;
  par?: number | null;
  access?: string | null;
  lat: number;
  lon: number;
};

type Geo = { lat: number; lon: number };

const golfIcon = L.divIcon({
  className: "golf-marker",
  html: `
  <div style="
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #1f8a3b;
    box-shadow: 0 2px 8px rgba(0,0,0,.25);
    border: 2px solid white;
    position: relative;
    box-sizing: border-box;
  ">
    <div style="
      position: absolute;
      left: 5px;
      top: 2px;
      width: 2px;
      height: 11px;
      background: white;
      border-radius: 2px;
    "></div>
    <div style="
      position: absolute;
      left: 7px;
      top: 2px;
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 5px solid yellow;
    "></div>
  </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const golfIconActive = L.divIcon({
  className: "golf-marker-active",
  html: `
  <div style="
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #2ecc71;
    box-shadow: 0 0 0 4px rgba(46,204,113,0.25), 0 4px 12px rgba(0,0,0,.35);
    border: 2px solid white;
    position: relative;
    box-sizing: border-box;
  ">
    <div style="
      position: absolute;
      left: 7px;
      top: 3px;
      width: 2px;
      height: 13px;
      background: white;
      border-radius: 2px;
    "></div>
    <div style="
      position: absolute;
      left: 9px;
      top: 3px;
      width: 0;
      height: 0;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-left: 6px solid yellow;
    "></div>
  </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

function toFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeWebsite(url?: string | null) {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function useGeolocation() {
  const [pos, setPos] = useState<Geo | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  return pos;
}

function FixLeafletSize() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 50);
  }, [map]);

  return null;
}

function PersistMapView() {
  const map = useMap();

  useEffect(() => {
    const save = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();

      localStorage.setItem(
        "fairwayd-map-view",
        JSON.stringify({
          lat: center.lat,
          lon: center.lng,
          zoom,
        }),
      );
    };

    map.on("moveend", save);
    map.on("zoomend", save);

    save();

    return () => {
      map.off("moveend", save);
      map.off("zoomend", save);
    };
  }, [map]);

  return null;
}

function FitToData({
  userPos,
  locked,
}: {
  userPos: Geo | null;
  courses: Course[];
  locked: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (locked) return;
    if (!userPos) return;

    const lat = toFiniteNumber(userPos.lat);
    const lon = toFiniteNumber(userPos.lon);

    if (lat === null || lon === null) {
      console.warn("FitToData skip setView invalid userPos", userPos);
      return;
    }

    map.setView([lat, lon], 10);
  }, [userPos, map, locked]);

  return null;
}

function LoggedInBadge({ isLoggedIn }: { isLoggedIn: boolean }) {
  const handle = localStorage.getItem("fairwayd_handle") ?? "";
  if (!isLoggedIn) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1000,
        background: "white",
        padding: "8px 10px",
        borderRadius: 999,
        boxShadow: "0 2px 12px rgba(0,0,0,.15)",
        fontFamily: "system-ui",
        fontSize: 12,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span style={{ fontWeight: 800 }}>Logged in</span>
      <span style={{ opacity: 0.8 }}>{handle ? `@${handle}` : ""}</span>
    </div>
  );
}

function CourseFollowButton({
  courseId,
  fullWidth = false,
}: {
  courseId: string;
  fullWidth?: boolean;
}) {
  const { token, isFollowing, followBusy, toggleFollow } =
    useCourseFollow(courseId);

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFollow();
      }}
      disabled={followBusy || !token}
      title={!token ? "Please login" : "Follow course"}
      style={{
        width: fullWidth ? "100%" : undefined,
        minHeight: fullWidth ? 40 : undefined,
        fontSize: 13,
        padding: fullWidth ? "0 13px" : "8px 12px",
        borderRadius: fullWidth ? 18 : 999,
        border: isFollowing
          ? "1px solid var(--green)"
          : "1px solid var(--border)",
        background: isFollowing
          ? "color-mix(in srgb, var(--green) 16%, var(--muted))"
          : "var(--muted)",
        color: "var(--text)",
        fontWeight: 850,
        cursor: !token ? "not-allowed" : followBusy ? "default" : "pointer",
        opacity: !token ? 0.72 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      {followBusy ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}

function ClusteredCourseMarkers({
  courses,
  markerRefs,
  onSelectCourse,
}: {
  courses: Course[];
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
  onSelectCourse: (courseId: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 13,
    });

    courses.forEach((c) => {
      const lat = toFiniteNumber(c.lat);
      const lon = toFiniteNumber(c.lon);

      if (
        lat == null ||
        lon == null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        return;
      }

      const isActive = c.id === (window as any).__activeCourseId;

      const marker = L.marker([lat, lon], {
        icon: isActive ? golfIconActive : golfIcon,
      });

      marker.on("click", () => {
        onSelectCourse(c.id);
      });

      markerRefs.current[c.id] = marker;
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      clusterGroup.clearLayers();
      map.removeLayer(clusterGroup);
      markerRefs.current = {};
    };
  }, [
    courses,
    map,
    markerRefs,
    onSelectCourse,
    (window as any).__activeCourseId,
  ]);

  return null;
}

export default function CoursesMap() {
  useEffect(() => {
    localStorage.removeItem("fairwayd-map-view");
  }, []);

  const userPos = useGeolocation();
  const nav = useNavigate();

  const { isAuthenticated } = useAuth();
  const { setSelectedCourse } = useSelectedCourse();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<"map" | "satellite">(() => {
    const saved = localStorage.getItem("fairwayd-map-style");
    return saved === "satellite" ? "satellite" : "map";
  });
  useEffect(() => {
    localStorage.setItem("fairwayd-map-style", mapStyle);
  }, [mapStyle]);

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [highlightedCourseId, setHighlightedCourseId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  (window as any).__activeCourseId = activeCourseId ?? highlightedCourseId;

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 980;
  const userLat = toFiniteNumber(userPos?.lat);
  const userLon = toFiniteNumber(userPos?.lon);
  const hasValidUserPos = userLat !== null && userLon !== null;

  const courseIdFromUrl = useMemo(() => {
    return null;
  }, []);

  const mapTileUrl =
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const mapTileAttribution = "&copy; OpenStreetMap contributors &copy; CARTO";

  const satelliteTileUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  const satelliteLabelsUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

  const satelliteTileAttribution =
    "&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community";
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const activeCourse = useMemo(() => {
    if (!activeCourseId) return null;
    return courses.find((c) => c.id === activeCourseId) ?? null;
  }, [activeCourseId, courses]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    return courses
      .filter((course) =>
        [course.name, course.city, course.country]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 8);
  }, [courses, searchQuery]);

  const stopBtn = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const center = useMemo<[number, number]>(() => {
    const lat = toFiniteNumber(userPos?.lat);
    const lon = toFiniteNumber(userPos?.lon);

    if (lat !== null && lon !== null) {
      return [lat, lon];
    }

    return [47.3769, 8.5417]; // Zurich fallback
  }, [userPos]);

  useEffect(() => {
    apiGet<Course[]>("/courses")
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
        else setLoadError("GET /courses returned non-array JSON");
      })
      .catch((e: any) => setLoadError(e?.message ?? String(e)));
  }, []);

  const handleSelectCourse = useCallback(
    (courseId: string) => {
      const course = courses.find((c) => c.id === courseId);
      if (course) setSelectedCourse(course);
      setHighlightedCourseId(null);
      setActiveCourseId(courseId);
    },
    [courses, setSelectedCourse],
  );

  const handleSearchSelectCourse = useCallback(
    (course: Course) => {
      setSearchQuery(course.name);
      setSearchOpen(false);
      setSelectedCourse(course);
      setActiveCourseId(null);
      setHighlightedCourseId(course.id);
      mapRef?.setView([course.lat, course.lon], 14, { animate: true });
    },
    [mapRef, setSelectedCourse],
  );

  if (loadError) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          Failed to load courses
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 12 }}>{loadError}</div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <LoggedInBadge isLoggedIn={isAuthenticated} />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          width: isMobile ? "min(68vw, 190px)" : "min(23vw, 245px)",
          transform: "translateX(-50%)",
          zIndex: 1200,
        }}
      >
        <div
          style={{
            position: "relative",
            border: "1px solid rgba(255,255,255,0.46)",
            background: "rgba(255,255,255,0.58)",
            borderRadius: 999,
            boxShadow: "0 4px 12px rgba(0,0,0,.12)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 6px 0 10px",
            }}
          >
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search courses"
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                outline: "none",
                background: "transparent",
                color: "#111",
                fontSize: 12,
                fontWeight: 700,
                height: 30,
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                aria-label="Clear course search"
                title="Clear"
                style={{
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.34)",
                  color: "#111",
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  cursor: "pointer",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                x
              </button>
            ) : null}
          </div>

          {searchOpen && searchQuery.trim().length >= 2 ? (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                display: "grid",
                gap: 2,
                padding: 4,
                border: "1px solid rgba(255,255,255,0.48)",
                background: "rgba(255,255,255,0.72)",
                borderRadius: 12,
                boxShadow: "0 8px 20px rgba(0,0,0,.16)",
                backdropFilter: "blur(14px)",
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {searchResults.length > 0 ? (
                searchResults.map((course) => {
                  const subtitle = [course.city, course.country]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => handleSearchSelectCourse(course)}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "#111",
                        textAlign: "left",
                        padding: "7px 8px",
                        borderRadius: 9,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          lineHeight: 1.2,
                        }}
                      >
                        {course.name}
                      </div>
                      {subtitle ? (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "rgba(17,17,17,0.62)",
                            lineHeight: 1.3,
                          }}
                        >
                          {subtitle}
                        </div>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "8px 8px",
                    fontSize: 12,
                    color: "rgba(17,17,17,0.62)",
                  }}
                >
                  No courses found.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: isMobile ? 72 : 76,
          left: isMobile ? 52 : 12,
          zIndex: 1000,
          display: "inline-flex",
          gap: 4,
          padding: 4,
          borderRadius: 999,
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 22px rgba(0,0,0,.16)",
          backdropFilter: "blur(12px)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={() => setMapStyle("map")}
          aria-pressed={mapStyle === "map"}
          title="Standard map"
          style={{
            border: 0,
            outline: 0,
            borderRadius: 999,
            height: isMobile ? 30 : 32,
            padding: isMobile ? "0 14px" : "0 18px",
            minWidth: isMobile ? 58 : 70,
            background: mapStyle === "map" ? "var(--green)" : "transparent",
            color: mapStyle === "map" ? "white" : "var(--text)",
            fontWeight: 850,
            fontSize: isMobile ? 12 : 13,
            boxShadow:
              mapStyle === "map"
                ? "inset 0 -1px 0 rgba(0,0,0,.16)"
                : "none",
            cursor: "pointer",
            transition:
              "background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, opacity 0.15s ease",
          }}
        >
          Map
        </button>

        <button
          type="button"
          onClick={() => setMapStyle("satellite")}
          aria-pressed={mapStyle === "satellite"}
          title="Satellite hybrid"
          style={{
            border: 0,
            outline: 0,
            borderRadius: 999,
            height: isMobile ? 30 : 32,
            padding: isMobile ? "0 14px" : "0 18px",
            minWidth: isMobile ? 82 : 94,
            background:
              mapStyle === "satellite" ? "var(--green)" : "transparent",
            color: mapStyle === "satellite" ? "white" : "var(--text)",
            fontWeight: 850,
            fontSize: isMobile ? 12 : 13,
            boxShadow:
              mapStyle === "satellite"
                ? "inset 0 -1px 0 rgba(0,0,0,.16)"
                : "none",
            cursor: "pointer",
            transition:
              "background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, opacity 0.15s ease",
          }}
        >
          Satellite
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={8}
        style={{ height: "100%", width: "100%" }}
        ref={setMapRef}
      >
        {mapStyle === "map" ? (
          <TileLayer attribution={mapTileAttribution} url={mapTileUrl} />
        ) : (
          <>
            <TileLayer
              attribution={satelliteTileAttribution}
              url={satelliteTileUrl}
            />
            <TileLayer
              attribution={satelliteTileAttribution}
              url={satelliteLabelsUrl}
            />
          </>
        )}

        <FixLeafletSize />
        <PersistMapView />

        <FitToData
          userPos={userPos}
          courses={courses}
          locked={!!courseIdFromUrl}
        />

        {userPos &&
          Number.isFinite(userPos.lat) &&
          Number.isFinite(userPos.lon) && (
            <CircleMarker center={[userPos.lat, userPos.lon]} radius={8}>
              <Popup>Your location</Popup>
            </CircleMarker>
          )}

        <ClusteredCourseMarkers
          courses={courses}
          markerRefs={markerRefs}
          onSelectCourse={handleSelectCourse}
        />

        {activeCourse &&
          (() => {
            const c = activeCourse;

            const lat = toFiniteNumber(c.lat);
            const lon = toFiniteNumber(c.lon);

            if (lat === null || lon === null) {
              return null;
            }

            const locationLine = [c.city, c.region, c.country]
              .filter(Boolean)
              .join(", ");
            const websiteUrl = normalizeWebsite(c.website);
            const golfMeta = [c.holes ? `${c.holes} holes` : null, c.par ? `Par ${c.par}` : null]
              .filter(Boolean)
              .join(" / ");
            const accessLabel = c.access?.replaceAll("_", " ");

            return (
              <Popup
                className="fw-course-popup"
                position={[lat, lon]}
                offset={[0, -10]}
                autoPan={true}
                autoPanPaddingTopLeft={[20, 120]}
                autoPanPaddingBottomRight={[20, 80]}
                eventHandlers={{
                  remove: () => setActiveCourseId(null),
                }}
              >
                <div
                  style={{
                    width: 272,
                    maxWidth: "calc(100vw - 48px)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: 12,
                    borderRadius: 22,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text)",
                    boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
                  }}
                >
                  <div style={{ display: "grid", gap: 5 }}>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 900,
                        lineHeight: 1.15,
                        color: "var(--text)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {c.name}
                    </div>

                    {locationLine ? (
                      <div
                        style={{
                          fontSize: 12,
                          lineHeight: 1.35,
                          color: "var(--sub)",
                        }}
                      >
                        {locationLine}
                      </div>
                    ) : null}
                  </div>

                  {(golfMeta || accessLabel) && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        flexWrap: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      {golfMeta ? (
                        <span
                          style={{
                            minWidth: 0,
                            minHeight: 28,
                            padding: "0 9px",
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            background: "var(--muted)",
                            color: "var(--text)",
                            fontSize: 12,
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {golfMeta}
                        </span>
                      ) : null}

                      {accessLabel ? (
                        <span
                          style={{
                            minWidth: 0,
                            minHeight: 28,
                            padding: "0 9px",
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            background: "var(--muted)",
                            color: "var(--text)",
                            fontSize: 12,
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textTransform: "capitalize",
                          }}
                        >
                          {accessLabel}
                        </span>
                      ) : null}
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onMouseDown={stopBtn}
                      onClick={(e) => {
                        stopBtn(e);

                        setSelectedCourse({
                          id: c.id,
                          name: c.name,
                          lat,
                          lon,
                        });

                        nav(`/courses/${c.id}`);
                      }}
                      style={{
                        width: "100%",
                        minHeight: 40,
                        border: "1px solid var(--green)",
                        background: "var(--green)",
                        color: "var(--bg)",
                        borderRadius: 18,
                        padding: "0 13px",
                        fontSize: 13,
                        fontWeight: 900,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                      }}
                    >
                      Open Course
                    </button>

                    <CourseFollowButton courseId={c.id} fullWidth />

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                      target="_blank"
                      rel="noreferrer"
                      onMouseDown={stopBtn}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: "100%",
                        minHeight: 40,
                        border: "1px solid var(--border)",
                        background: "var(--muted)",
                        color: "var(--text)",
                        borderRadius: 18,
                        padding: "0 13px",
                        fontSize: 13,
                        fontWeight: 850,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                      }}
                    >
                      Check on Google
                    </a>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`}
                      target="_blank"
                      rel="noreferrer"
                      onMouseDown={stopBtn}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: "100%",
                        minHeight: 40,
                        border: "1px solid var(--green)",
                        background: "color-mix(in srgb, var(--green) 18%, var(--card))",
                        color: "var(--text)",
                        borderRadius: 18,
                        padding: "0 13px",
                        fontSize: 13,
                        fontWeight: 900,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                      }}
                    >
                      Bring me there
                    </a>
                  </div>

                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      onMouseDown={stopBtn}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: "var(--green)",
                        fontSize: 12,
                        fontWeight: 800,
                        lineHeight: 1.35,
                        textAlign: "center",
                        textDecoration: "none",
                      }}
                    >
                      Visit website
                    </a>
                  ) : null}
                </div>
              </Popup>
            );
          })()}
      </MapContainer>

      {hasValidUserPos && (
        <button
          type="button"
          title="My location"
          aria-label="My location"
          onClick={() => {
            if (!mapRef || userLat === null || userLon === null) return;
            mapRef.setView([userLat, userLon], 13, { animate: true });
          }}
          style={{
            position: "absolute",
            top: isMobile ? 126 : 132,
            left: isMobile ? 12 : 12,
            zIndex: 1000,
            width: 38,
            height: 38,
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            boxShadow: "0 4px 14px rgba(0,0,0,.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 19,
            fontWeight: 800,
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          ⌖
        </button>
      )}
    </div>
  );
}
