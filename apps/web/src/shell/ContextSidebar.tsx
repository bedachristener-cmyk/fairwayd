import { useEffect, useMemo, useState } from "react";
import { Flag, MapPinned } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { API_BASE } from "../api/base";
import { fileUrl } from "../api/fileUrl";
import { getRatingSummary, type RatingSummary } from "../api/ratings";
import { useAuth } from "../auth/AuthContext";
import { DESTINATION_INFO } from "../data/destinationInfo";
import { useCourseFollow } from "../hooks/useCourseFollow";
import { useSelectedCourse } from "../state/SelectedCourseContext";

type ContextCourse = {
  id: string;
  name: string;
  lat?: number | string | null;
  lon?: number | string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  holes?: number | null;
  website?: string | null;
  access?: string | null;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  heroImageUrl?: string | null;
  photoUrl?: string | null;
  thumbnailUrl?: string | null;
  images?: { url?: string | null }[] | null;
};

type DestinationData = {
  destination?: {
    name?: string | null;
    code?: string | null;
    slug?: string | null;
    courseCount?: number | null;
    followerCount?: number | null;
  } | null;
  items?: ContextCourse[];
};

type TripItem = {
  type?: string | null;
  date?: string | null;
  endDate?: string | null;
  startsAt?: string | null;
  courseId?: string | null;
  course?: { id?: string | null; name?: string | null } | null;
};

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
  coverImageUrl?: string | null;
  members?: unknown[];
  items?: TripItem[];
  _count?: { items?: number };
};

type ContextUser = {
  id: string;
  handle: string;
  name?: string | null;
  avatarUrl?: string | null;
};

type MapView = { lat: number; lon: number; zoom?: number };

const DEFAULT_CENTER: MapView = { lat: 47.5596, lon: 7.5886, zoom: 5 };

const golfIcon = L.divIcon({
  className: "",
  html: `
    <div style="width:18px;height:18px;border-radius:999px;background:var(--green);border:2px solid rgba(255,255,255,.86);box-shadow:0 6px 18px rgba(76,152,99,.26);position:relative;">
      <div style="position:absolute;left:7px;top:3px;width:2px;height:10px;background:#17251f;"></div>
      <div style="position:absolute;left:9px;top:3px;width:6px;height:5px;background:#d98272;clip-path:polygon(0 0,100% 50%,0 100%);"></div>
    </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:999px;background:#3b82f6;border:3px solid rgba(255,255,255,.9);box-shadow:0 6px 16px rgba(59,130,246,.28);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function toNumber(value?: number | string | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasCoords(course?: ContextCourse | null) {
  return toNumber(course?.lat) != null && toNumber(course?.lon) != null;
}

function courseLocation(course?: ContextCourse | null) {
  return [course?.city, course?.region, course?.country]
    .filter(Boolean)
    .join(", ");
}

function formatAccess(access?: string | null) {
  if (!access) return "";
  return access
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeWebsite(url?: string | null) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function shortDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function tripDateRange(trip?: Trip | null) {
  const times =
    trip?.items
      ?.flatMap((item) => [item.date ?? item.startsAt, item.endDate])
      .map((value) => (value ? new Date(value).getTime() : Number.NaN))
      .filter((value) => Number.isFinite(value)) ?? [];

  if (times.length === 0) return "";
  const start = shortDate(new Date(Math.min(...times)).toISOString());
  const end = shortDate(new Date(Math.max(...times)).toISOString());
  if (!start || !end) return "";
  return start === end ? start : `${start} - ${end}`;
}

function golfRoundCount(trip?: Trip | null) {
  return (
    trip?.items?.filter((item) => {
      const value = `${item.type ?? ""} ${item.course?.name ?? ""}`;
      return /golf|round|tee|course/i.test(value);
    }).length ?? 0
  );
}

function parseList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray((data as any)?.items)) return (data as any).items as T[];
  return [];
}

function normalizeUser(row: any, key: "following" | "follower"): ContextUser | null {
  const user = row?.[key] ?? row;
  const id = user?.id ?? row?.[`${key}Id`];
  const handle = user?.handle ?? row?.[`${key}Handle`];

  if (typeof id !== "string" || typeof handle !== "string") return null;

  return {
    id,
    handle,
    name: user?.name ?? row?.[`${key}Name`] ?? null,
    avatarUrl: user?.avatarUrl ?? row?.[`${key}AvatarUrl`] ?? null,
  };
}

function initials(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return (trimmed.slice(0, 1) || "F").toUpperCase();
}

function courseImageUrl(course?: ContextCourse | null) {
  if (!course) return "";

  const direct =
    course.thumbnailUrl ??
    course.imageUrl ??
    course.coverImageUrl ??
    course.heroImageUrl ??
    course.photoUrl ??
    course.images?.[0]?.url ??
    "";

  return fileUrl(direct);
}

function destinationInfoKey(slug?: string) {
  if (!slug) return "";
  const aliases: Record<string, string> = {
    th: "thailand",
    ch: "switzerland",
    pt: "portugal",
    es: "spain",
    jp: "japan",
    za: "south-africa",
    us: "united-states",
  };
  return aliases[slug.toLowerCase()] ?? slug.toLowerCase();
}

function readLastMapView(): MapView | null {
  try {
    const raw = window.localStorage.getItem("fairwayd-map-view");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = toNumber(parsed?.lat);
    const lon = toNumber(parsed?.lon);
    const zoom = toNumber(parsed?.zoom);
    if (lat == null || lon == null) return null;
    return { lat, lon, zoom: zoom ?? undefined };
  } catch {
    return null;
  }
}

function useGrantedGeolocation() {
  const [position, setPosition] = useState<MapView | null>(null);

  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions?.query) return;
    let cancelled = false;

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (cancelled || status.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) {
              setPosition({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                zoom: 11,
              });
            }
          },
          () => {},
          { enableHighAccuracy: true },
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return position;
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="fw-context-card">
      <div className="fw-context-card__header">
        <h2>{title}</h2>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function RecenterMap({ center, zoom }: { center: MapView; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lon], zoom, { animate: true });
  }, [center.lat, center.lon, zoom, map]);

  return null;
}

function MiniMap({
  courses,
  fallbackCenter,
}: {
  courses: ContextCourse[];
  fallbackCenter: MapView;
}) {
  const validCourses = courses.filter(hasCoords);
  const first = validCourses[0];
  const center = first
    ? {
        lat: toNumber(first.lat) ?? fallbackCenter.lat,
        lon: toNumber(first.lon) ?? fallbackCenter.lon,
        zoom: validCourses.length > 1 ? 7 : 11,
      }
    : fallbackCenter;
  const zoom = center.zoom ?? (validCourses.length > 1 ? 7 : 11);

  return (
    <div className="fw-context-map">
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={center} zoom={zoom} />
        {validCourses.slice(0, 12).map((course) => {
          const lat = toNumber(course.lat);
          const lon = toNumber(course.lon);
          if (lat == null || lon == null) return null;

          return (
            <Marker key={course.id} position={[lat, lon]} icon={golfIcon}>
              <Popup>
                <strong>{course.name}</strong>
              </Popup>
            </Marker>
          );
        })}
        {validCourses.length === 0 ? (
          <Marker position={[center.lat, center.lon]} icon={userIcon}>
            <Popup>Current area</Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="fw-context-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CourseThumb({
  course,
  variant = "course",
}: {
  course?: ContextCourse | null;
  variant?: "course" | "map";
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = courseImageUrl(course);
  const Icon = variant === "map" ? MapPinned : Flag;

  return (
    <div className="fw-context-course-thumb" aria-hidden="true">
      {imageUrl && !failed ? (
        <img src={imageUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="fw-context-course-thumb__fallback">
          <Icon size={18} strokeWidth={2.4} />
        </span>
      )}
    </div>
  );
}

function ThumbImage({
  src,
  alt,
  fallback,
}: {
  src: string;
  alt: string;
  fallback: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return <img src={src} alt={alt} onError={() => setFailed(true)} />;
  }

  return <span>{fallback}</span>;
}

function TripThumb({ trip }: { trip: Trip }) {
  const coverUrl = fileUrl(trip.coverImageUrl);

  return (
    <div className="fw-context-trip-thumb" aria-hidden="true">
      <ThumbImage
        src={coverUrl}
        alt=""
        fallback={initials(trip.destination ?? trip.title)}
      />
    </div>
  );
}

function AvatarStackItem({ user }: { user: ContextUser }) {
  const [failed, setFailed] = useState(false);
  const src = fileUrl(user.avatarUrl);

  if (!src || failed) return null;

  return (
    <span title={user.name || `@${user.handle}`}>
      <img
        src={src}
        alt={user.name || user.handle}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function AvatarStack({ users }: { users: ContextUser[] }) {
  const visualUsers = users.filter((user) => user.avatarUrl).slice(0, 5);

  if (visualUsers.length === 0) {
    return <div className="fw-context-row__mark" aria-hidden="true" />;
  }

  return (
    <div className="fw-context-avatar-stack" aria-label="Golfers">
      {visualUsers.map((user) => (
        <AvatarStackItem key={user.id} user={user} />
      ))}
    </div>
  );
}

function CourseIconStack({ courses }: { courses: ContextCourse[] }) {
  const visibleCourses = courses.slice(0, 3);

  if (visibleCourses.length === 0) return <CourseThumb />;

  return (
    <div className="fw-context-course-stack" aria-label="Courses">
      {visibleCourses.map((course) => (
        <CourseThumb key={course.id} course={course} />
      ))}
    </div>
  );
}

function CourseRows({ courses }: { courses: ContextCourse[] }) {
  return (
    <div className="fw-context-list">
      {courses.slice(0, 3).map((course) => (
        <Link
          key={course.id}
          to={`/courses/${course.id}`}
          className="fw-context-row"
        >
          <CourseThumb course={course} />
          <div>
            <strong>{course.name}</strong>
            <span>
              {[courseLocation(course), course.holes ? `${course.holes} holes` : ""]
                .filter(Boolean)
                .join(" / ")}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function TripRows({ trips }: { trips: Trip[] }) {
  return (
    <div className="fw-context-list">
      {trips.slice(0, 2).map((trip) => (
        <Link key={trip.id} to={`/trips/${trip.id}`} className="fw-context-row">
          <TripThumb trip={trip} />
          <div>
            <strong>{trip.title}</strong>
            <span>
              {[trip.destination, tripDateRange(trip), `${golfRoundCount(trip)} rounds`]
                .filter(Boolean)
                .join(" / ")}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CoursesCard({
  followedCourses,
  followingCount,
}: {
  followedCourses: ContextCourse[];
  followingCount: number | null;
}) {
  return (
    <Card title="Courses">
      <div className="fw-context-list">
        {followingCount != null ? (
          <Link to="/following" className="fw-context-row">
            <CourseIconStack courses={followedCourses} />
            <div>
              <strong>Courses I follow</strong>
              <span>{followingCount} followed</span>
            </div>
          </Link>
        ) : null}
        <Link to="/map" className="fw-context-row">
          <CourseThumb variant="map" />
          <div>
            <strong>Open course map</strong>
            <span>Browse courses nearby and abroad</span>
          </div>
        </Link>
      </div>
    </Card>
  );
}

function PeopleCard({
  followingUsers,
  sentUsers,
  requestUsers,
  requestCount,
}: {
  followingUsers: ContextUser[];
  sentUsers: ContextUser[];
  requestUsers: ContextUser[];
  requestCount: number | null;
}) {
  return (
    <Card title="People">
      <div className="fw-context-list">
        {followingUsers.length > 0 ? (
          <Link to="/friends" className="fw-context-row">
            <AvatarStack users={followingUsers} />
            <div>
              <strong>Golfers I follow</strong>
              <span>{followingUsers.length} golfers</span>
            </div>
          </Link>
        ) : null}
        {sentUsers.length > 0 ? (
          <Link to="/follow-requests" className="fw-context-row">
            <AvatarStack users={sentUsers} />
            <div>
              <strong>Golfers I requested</strong>
              <span>{sentUsers.length} pending</span>
            </div>
          </Link>
        ) : null}
        {requestCount != null ? (
          <Link to="/follow-requests" className="fw-context-row">
            <AvatarStack users={requestUsers} />
            <div>
              <strong>Follow requests</strong>
              <span>{requestCount} pending</span>
            </div>
          </Link>
        ) : null}
        <Link to="/users" className="fw-context-row">
          <div className="fw-context-row__mark" aria-hidden="true" />
          <div>
            <strong>Find golfers</strong>
            <span>Search the Fairwayd community</span>
          </div>
        </Link>
      </div>
    </Card>
  );
}

function SelectedCourseCard({
  course,
  rating,
  token,
  isFollowing,
  followBusy,
  toggleFollow,
}: {
  course: ContextCourse;
  rating: RatingSummary | null;
  token: string | null;
  isFollowing: boolean;
  followBusy: boolean;
  toggleFollow: () => void;
}) {
  const website = normalizeWebsite(course.website);

  return (
    <Card title="Selected course">
      <div className="fw-context-selected">
        <CourseThumb course={course} />
        <strong>{course.name}</strong>
        <span>
          {[courseLocation(course), course.holes ? `${course.holes} holes` : ""]
            .filter(Boolean)
            .join(" / ")}
        </span>
        <div className="fw-context-facts">
          <Fact
            label="Rating"
            value={
              rating?.count
                ? `${rating.overall.toFixed(1)} / ${rating.count} reviews`
                : ""
            }
          />
          <Fact label="Access" value={formatAccess(course.access)} />
          <Fact
            label="Website"
            value={
              website ? (
                <a href={website} target="_blank" rel="noreferrer">
                  Visit site
                </a>
              ) : (
                ""
              )
            }
          />
        </div>
        <div className="fw-context-actions">
          <Link to={`/courses/${course.id}`}>View course</Link>
          {token ? (
            <button type="button" onClick={toggleFollow} disabled={followBusy}>
              {followBusy ? "Saving..." : isFollowing ? "Following" : "Follow"}
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function TripCard({ title, trip }: { title: string; trip: Trip }) {
  return (
    <Card title={title}>
      <div className="fw-context-trip">
        <TripThumb trip={trip} />
        <strong>{trip.title}</strong>
        <span>
          {[trip.destination, tripDateRange(trip)].filter(Boolean).join(" / ")}
        </span>
        <div className="fw-context-trip__stats">
          {trip.members ? <span>{trip.members.length} members</span> : null}
          {trip._count?.items != null ? <span>{trip._count.items} items</span> : null}
          <span>{golfRoundCount(trip)} rounds</span>
        </div>
        <Link to={`/trips/${trip.id}`}>View trip</Link>
      </div>
    </Card>
  );
}

export default function ContextSidebar() {
  const location = useLocation();
  const nav = useNavigate();
  const { token } = useAuth();
  const { selectedCourse, setSelectedCourse } = useSelectedCourse();
  const browserPosition = useGrantedGeolocation();

  const [destinationData, setDestinationData] =
    useState<DestinationData | null>(null);
  const [allCourses, setAllCourses] = useState<ContextCourse[]>([]);
  const [routeCourse, setRouteCourse] = useState<ContextCourse | null>(null);
  const [rating, setRating] = useState<RatingSummary | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routeTrip, setRouteTrip] = useState<Trip | null>(null);
  const [followedCourses, setFollowedCourses] = useState<ContextCourse[]>([]);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const [followingUsers, setFollowingUsers] = useState<ContextUser[]>([]);
  const [sentUsers, setSentUsers] = useState<ContextUser[]>([]);
  const [requestUsers, setRequestUsers] = useState<ContextUser[]>([]);

  const pathname = location.pathname;
  const isDestinationsRoute = pathname.startsWith("/destinations");
  const isMapRoute = pathname.startsWith("/map");
  const isFeedRoute = pathname.startsWith("/feed");
  const isProfileRoute =
    pathname.startsWith("/profile") || pathname.startsWith("/u/");
  const destinationSlug = pathname.startsWith("/destinations/")
    ? pathname.split("/")[2]
    : "";
  const courseId = pathname.startsWith("/courses/")
    ? pathname.split("/")[2]
    : "";
  const tripId =
    pathname.startsWith("/trips/") && pathname.split("/")[2] !== "new"
      ? pathname.split("/")[2]
      : "";

  const supportsSelectedCourse =
    Boolean(courseId) || isMapRoute || Boolean(destinationSlug);
  const contextCourse = (
    routeCourse ?? (supportsSelectedCourse ? selectedCourse : null)
  ) as ContextCourse | null;
  const { isFollowing, followBusy, toggleFollow } = useCourseFollow(
    contextCourse?.id ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/courses`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setAllCourses(parseList<ContextCourse>(data));
      })
      .catch(() => {
        if (!cancelled) setAllCourses([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCourse?.id || allCourses.length === 0) return;

    const full = allCourses.find((course) => course.id === selectedCourse.id);
    if (!full) return;

    const missingDetails =
      ((selectedCourse as any).city == null && full.city != null) ||
      ((selectedCourse as any).region == null && full.region != null) ||
      ((selectedCourse as any).country == null && full.country != null) ||
      ((selectedCourse as any).website == null && full.website != null) ||
      ((selectedCourse as any).holes == null && full.holes != null) ||
      ((selectedCourse as any).access == null && full.access != null);

    if (!missingDetails) return;
    setSelectedCourse({ ...(selectedCourse as any), ...full });
  }, [allCourses, selectedCourse, setSelectedCourse]);

  useEffect(() => {
    setDestinationData(null);
    if (!destinationSlug) return;

    let cancelled = false;

    fetch(`${API_BASE}/destinations/${encodeURIComponent(destinationSlug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(async (destination) => {
        if (!destination?.code) return destination;

        const coursesRes = await fetch(
          `${API_BASE}/courses/by-country/${encodeURIComponent(destination.code)}`,
        );
        const courses = coursesRes.ok ? await coursesRes.json() : null;

        return {
          destination,
          items: Array.isArray(courses?.items) ? courses.items : [],
        };
      })
      .then((data) => {
        if (!cancelled) setDestinationData(data);
      })
      .catch(() => {
        if (!cancelled) setDestinationData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [destinationSlug]);

  useEffect(() => {
    setRouteCourse(null);
    setRating(null);
    if (!courseId) return;

    let cancelled = false;

    fetch(`${API_BASE}/courses/${encodeURIComponent(courseId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setRouteCourse(data);
        setSelectedCourse(data);
      })
      .catch(() => {
        if (!cancelled) setRouteCourse(null);
      });

    getRatingSummary(courseId)
      .then((data) => {
        if (!cancelled) setRating(data);
      })
      .catch(() => {
        if (!cancelled) setRating(null);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, setSelectedCourse]);

  useEffect(() => {
    if (!contextCourse?.id || courseId) return;

    let cancelled = false;

    getRatingSummary(contextCourse.id)
      .then((data) => {
        if (!cancelled) setRating(data);
      })
      .catch(() => {
        if (!cancelled) setRating(null);
      });

    return () => {
      cancelled = true;
    };
  }, [contextCourse?.id, courseId]);

  useEffect(() => {
    if (!token) {
      setTrips([]);
      setRouteTrip(null);
      setFollowedCourses([]);
      setFollowingCount(null);
      setRequestCount(null);
      setFollowingUsers([]);
      setSentUsers([]);
      setRequestUsers([]);
      return;
    }

    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_BASE}/trips`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setTrips(parseList<Trip>(data));
      })
      .catch(() => {
        if (!cancelled) setTrips([]);
      });

    fetch(`${API_BASE}/courses/me/following`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          const courses = parseList<ContextCourse>(data);
          setFollowedCourses(courses);
          setFollowingCount(courses.length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFollowedCourses([]);
          setFollowingCount(null);
        }
      });

    fetch(`${API_BASE}/follows/requests/count`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          const count = Number((data as any)?.count);
          setRequestCount(Number.isFinite(count) ? count : null);
        }
      })
      .catch(() => {
        if (!cancelled) setRequestCount(null);
      });

    fetch(`${API_BASE}/users/me/following`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setFollowingUsers(
            parseList<any>(data)
              .map((row) => normalizeUser(row, "following"))
              .filter((user): user is ContextUser => Boolean(user)),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setFollowingUsers([]);
      });

    fetch(`${API_BASE}/users/me/follow-requests/sent`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setSentUsers(
            parseList<any>(data)
              .map((row) => normalizeUser(row, "following"))
              .filter((user): user is ContextUser => Boolean(user)),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSentUsers([]);
      });

    fetch(`${API_BASE}/users/me/follow-requests`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setRequestUsers(
            parseList<any>(data)
              .map((row) => normalizeUser(row, "follower"))
              .filter((user): user is ContextUser => Boolean(user)),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRequestUsers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    setRouteTrip(null);
    if (!token || !tripId) return;

    let cancelled = false;

    fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setRouteTrip(data);
      })
      .catch(() => {
        if (!cancelled) setRouteTrip(null);
      });

    return () => {
      cancelled = true;
    };
  }, [token, tripId]);

  const activeTrip = useMemo(() => {
    if (tripId) return routeTrip ?? trips.find((trip) => trip.id === tripId) ?? null;
    return trips[0] ?? null;
  }, [routeTrip, tripId, trips]);

  const relatedTrips = useMemo(() => {
    if (!courseId) return [];
    return trips.filter((trip) =>
      trip.items?.some(
        (item) => item.courseId === courseId || item.course?.id === courseId,
      ),
    );
  }, [courseId, trips]);

  const destinationInfo = destinationSlug
    ? DESTINATION_INFO[destinationInfoKey(destinationSlug)]
    : null;
  const destinationCourses = destinationData?.items ?? [];
  const lastMapView = typeof window === "undefined" ? null : readLastMapView();
  const fallbackCenter = browserPosition ?? lastMapView ?? DEFAULT_CENTER;
  const mapCourses =
    destinationCourses.length > 0
      ? destinationCourses
      : contextCourse && hasCoords(contextCourse)
        ? [contextCourse]
        : [];

  let pageSpecificCard: React.ReactNode = null;

  if (courseId && contextCourse) {
    pageSpecificCard = (
      <SelectedCourseCard
        course={contextCourse}
        rating={rating}
        token={token}
        isFollowing={isFollowing}
        followBusy={followBusy}
        toggleFollow={toggleFollow}
      />
    );
  } else if (courseId && relatedTrips.length > 0) {
    pageSpecificCard = (
      <Card title="Related trips">
        <TripRows trips={relatedTrips} />
      </Card>
    );
  } else if (pathname.startsWith("/trips") && activeTrip) {
    pageSpecificCard = (
      <TripCard title={tripId ? "This trip" : "Next trip"} trip={activeTrip} />
    );
  } else if (destinationSlug && destinationInfo?.overviewDescription) {
    pageSpecificCard = (
      <Card title="About this destination">
        <p className="fw-context-copy">{destinationInfo.overviewDescription}</p>
        {destinationCourses.length > 0 ? (
          <div className="fw-context-page-card__courses">
            <CourseRows courses={destinationCourses} />
          </div>
        ) : null}
      </Card>
    );
  } else if ((isMapRoute || isFeedRoute) && contextCourse) {
    pageSpecificCard = (
      <SelectedCourseCard
        course={contextCourse}
        rating={rating}
        token={token}
        isFollowing={isFollowing}
        followBusy={followBusy}
        toggleFollow={toggleFollow}
      />
    );
  } else if (isFeedRoute && (followingUsers.length > 0 || requestCount != null)) {
    pageSpecificCard = (
      <Card title="Network context">
        <div className="fw-context-list">
          {followingUsers.length > 0 ? (
            <Link to="/friends" className="fw-context-row">
              <AvatarStack users={followingUsers} />
              <div>
                <strong>Following activity</strong>
                <span>{followingUsers.length} golfers in your network</span>
              </div>
            </Link>
          ) : null}
          {requestCount != null ? (
            <Link to="/follow-requests" className="fw-context-row">
              <AvatarStack users={requestUsers} />
              <div>
                <strong>Follow requests</strong>
                <span>{requestCount} pending</span>
              </div>
            </Link>
          ) : null}
        </div>
      </Card>
    );
  } else if (isDestinationsRoute && contextCourse) {
    pageSpecificCard = (
      <SelectedCourseCard
        course={contextCourse}
        rating={rating}
        token={token}
        isFollowing={isFollowing}
        followBusy={followBusy}
        toggleFollow={toggleFollow}
      />
    );
  } else if (isProfileRoute) {
    pageSpecificCard = null;
  }

  return (
    <aside className="fw-context-sidebar" aria-label="Context sidebar">
      <div className="fw-context-stack">
        <Card
          title="Map"
          action={
            <button
              type="button"
              className="fw-context-link-button"
              onClick={() => nav("/map")}
            >
              Open in map
            </button>
          }
        >
          <MiniMap courses={mapCourses} fallbackCenter={fallbackCenter} />
        </Card>

        <CoursesCard
          followedCourses={followedCourses}
          followingCount={followingCount}
        />

        <PeopleCard
          followingUsers={followingUsers}
          sentUsers={sentUsers}
          requestUsers={requestUsers}
          requestCount={requestCount}
        />

        {pageSpecificCard}
      </div>
    </aside>
  );
}
