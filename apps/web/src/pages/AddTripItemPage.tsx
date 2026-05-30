import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BedDouble,
  Car,
  Flag,
  Plane,
  StickyNote,
} from "lucide-react";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";

type TripItemType =
  | "golf_round"
  | "hotel"
  | "transfer"
  | "car_rental"
  | "flight"
  | "free_day"
  | "note";

type TripItemVisibility = "GROUP" | "SELECTED" | "PRIVATE";
type ReturnToHotelMode = "" | "after_round" | "custom" | "own_transport";

type FormStep = 1 | 2;

const typeOptions: { value: TripItemType; label: string }[] = [
  { value: "golf_round", label: "Golf round" },
  { value: "hotel", label: "Hotel" },
  { value: "transfer", label: "Transfer" },
  { value: "car_rental", label: "Car rental" },
  { value: "flight", label: "Flight" },
  { value: "free_day", label: "Free day" },
  { value: "note", label: "Note" },
];

const visibilityOptions: { value: TripItemVisibility; label: string }[] = [
  { value: "GROUP", label: "Group" },
  { value: "SELECTED", label: "Selected members" },
  { value: "PRIVATE", label: "Private" },
];

const currencyOptions = [
  "THB",
  "CHF",
  "EUR",
  "USD",
  "JPY",
  "GBP",
  "AUD",
  "SGD",
  "MYR",
  "IDR",
  "PHP",
  "ZAR",
];

const golfDurationOptions = [
  { value: "", label: "Not specified" },
  { value: "240", label: "4h" },
  { value: "270", label: "4.5h" },
  { value: "300", label: "5h" },
  { value: "330", label: "5.5h" },
  { value: "360", label: "6h" },
];

type CourseSearchResult = {
  id: string;
  name: string;
  country: string;
  region?: string | null;
};

type TripMember = {
  id: string;
  displayName?: string | null;
  isGuest?: boolean;
  user?: {
    name?: string | null;
    handle?: string | null;
  } | null;
};

type Trip = {
  members?: TripMember[];
};

const fieldStyle: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  minHeight: 42,
  borderRadius: 11,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  padding: "9px 11px",
  font: "inherit",
  appearance: "none",
  WebkitAppearance: "none",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 5,
  fontSize: 13,
  fontWeight: 900,
  color: "var(--text)",
};

const sectionCardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  display: "grid",
  gap: 10,
  padding: 13,
  borderRadius: 17,
  border: "1px solid color-mix(in srgb, var(--border) 58%, transparent)",
  background: "var(--card)",
  boxShadow: "0 8px 22px rgba(0,0,0,0.055)",
};

const sectionIntroStyle: CSSProperties = {
  color: "var(--sub)",
  fontSize: 12,
  lineHeight: 1.4,
  fontWeight: 750,
};

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div
        style={{
          color: "var(--text)",
          fontSize: 14,
          lineHeight: 1.2,
          fontWeight: 950,
        }}
      >
        {title}
      </div>
      {subtitle ? <div style={sectionIntroStyle}>{subtitle}</div> : null}
    </div>
  );
}

function Card({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <section
      style={{
        ...sectionCardStyle,
        borderLeft: "4px solid var(--accent-strong)",
      }}
    >
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}

function itemTheme(type: TripItemType) {
  if (type === "golf_round") {
    return {
      color: "var(--accent-strong)",
      soft: "color-mix(in srgb, var(--accent) 8%, transparent)",
    };
  }
  if (type === "hotel") return { color: "#e66a5c", soft: "rgba(230, 106, 92, 0.08)" };
  if (type === "transfer" || type === "car_rental") {
    return { color: "#b9852f", soft: "rgba(185, 133, 47, 0.09)" };
  }
  if (type === "flight") return { color: "#4f86d9", soft: "rgba(79, 134, 217, 0.08)" };
  return { color: "#7467b8", soft: "rgba(116, 103, 184, 0.08)" };
}

function itemTitle(type: TripItemType) {
  if (type === "golf_round") return "Add Golf Round";
  if (type === "hotel") return "Add Hotel";
  if (type === "transfer" || type === "car_rental") return "Add Transport";
  if (type === "flight") return "Add Flight";
  if (type === "free_day") return "Add Activity";
  return "Add Note";
}

function itemNoun(type: TripItemType) {
  if (type === "golf_round") return "Golf Round";
  if (type === "hotel") return "Hotel";
  if (type === "transfer" || type === "car_rental") return "Transport";
  if (type === "flight") return "Flight";
  if (type === "free_day") return "Activity";
  return "Note";
}

function itemCta(type: TripItemType) {
  if (type === "golf_round") return "Add Golf Round";
  if (type === "hotel") return "Add Hotel";
  if (type === "transfer" || type === "car_rental") return "Add Transport";
  if (type === "flight") return "Add Flight";
  if (type === "free_day") return "Add Activity";
  return "Add Note";
}

function itemIcon(type: TripItemType) {
  if (type === "golf_round") return Flag;
  if (type === "hotel") return BedDouble;
  if (type === "transfer" || type === "car_rental") return Car;
  if (type === "flight") return Plane;
  return StickyNote;
}

function formatPlanDate(value: string) {
  if (!value) return "Choose date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const dateRangeTypes = new Set<TripItemType>([
  "hotel",
  "car_rental",
  "transfer",
  "flight",
  "free_day",
]);

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

function amountValue(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function durationFromTimes(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes == null || endMinutes == null) return "";

  const diff = endMinutes >= startMinutes
    ? endMinutes - startMinutes
    : endMinutes + 1440 - startMinutes;

  return diff > 0 ? String(diff) : "";
}

function durationLabel(value: string) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return "Custom";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  if (mins === 30) return `${hours}.5h`;
  return `${hours}h ${mins}m`;
}

function flightTitle(flightNumber: string) {
  const value = flightNumber.trim();
  if (!value) return "Flight";
  return value.toLowerCase().startsWith("flight ") ? value : `Flight ${value}`;
}

function memberDisplayName(member: TripMember) {
  return (
    member.displayName ||
    member.user?.name ||
    member.user?.handle ||
    "Fairwayd member"
  );
}

export default function AddTripItemPage() {
  const { tripId } = useParams();
  const nav = useNavigate();
  const { token } = useAuth();

  const [step, setStep] = useState<FormStep>(1);
  const [type, setType] = useState<TripItemType>("golf_round");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [departureFromHotelTime, setDepartureFromHotelTime] = useState("");
  const [roundDurationMinutes, setRoundDurationMinutes] = useState("");
  const [returnToHotel, setReturnToHotel] = useState("");
  const [returnToHotelMode, setReturnToHotelMode] =
    useState<ReturnToHotelMode>("");
  const [flightNumber, setFlightNumber] = useState("");
  const [fromAirport, setFromAirport] = useState("");
  const [toAirport, setToAirport] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [greenFee, setGreenFee] = useState("");
  const [caddyFee, setCaddyFee] = useState("");
  const [cartFee, setCartFee] = useState("");
  const [includeGreenFeeInSplit, setIncludeGreenFeeInSplit] = useState(true);
  const [includeCaddyFeeInSplit, setIncludeCaddyFeeInSplit] = useState(true);
  const [includeCartFeeInSplit, setIncludeCartFeeInSplit] = useState(true);
  const [directPrice, setDirectPrice] = useState("");
  const [providerPrice, setProviderPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CHF");
  const [courseQuery, setCourseQuery] = useState("");
  const [courseResults, setCourseResults] = useState<CourseSearchResult[]>([]);
  const [selectedCourse, setSelectedCourse] =
    useState<CourseSearchResult | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participantMemberIds, setParticipantMemberIds] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<TripItemVisibility>("GROUP");
  const [visibleToMemberIds, setVisibleToMemberIds] = useState<string[]>([]);
  const [paidByMemberId, setPaidByMemberId] = useState("");
  const [courseLoading, setCourseLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isGolfRound = type === "golf_round";
  const isHotel = type === "hotel";
  const isFlight = type === "flight";
  const theme = itemTheme(type);
  const pageTitle = itemTitle(type);
  const HeroIcon = itemIcon(type);
  const derivedGolfTitle = selectedCourse?.name || "Golf round";
  const selectedCourseLocation = selectedCourse
    ? [selectedCourse.region, selectedCourse.country].filter(Boolean).join(", ")
    : "";
  const summaryTitle = isGolfRound
    ? selectedCourse?.name || "Choose a golf course"
    : isFlight
      ? flightTitle(flightNumber)
      : title.trim() || itemNoun(type);
  const organizerTotal =
    (includeGreenFeeInSplit ? amountValue(greenFee) : 0) +
    (includeCaddyFeeInSplit ? amountValue(caddyFee) : 0) +
    (includeCartFeeInSplit ? amountValue(cartFee) : 0);
  const visibleGolfDurationOptions =
    roundDurationMinutes &&
    !golfDurationOptions.some((option) => option.value === roundDurationMinutes)
      ? [
          ...golfDurationOptions,
          {
            value: roundDurationMinutes,
            label: durationLabel(roundDurationMinutes),
          },
        ]
      : golfDurationOptions;

  function updateDate(nextDate: string) {
    setDate(nextDate);
    setEndDate((currentEndDate) =>
      currentEndDate && nextDate && currentEndDate < nextDate
        ? nextDate
        : currentEndDate,
    );
  }

  function updateEndDate(nextEndDate: string) {
    setEndDate(nextEndDate && date && nextEndDate < date ? date : nextEndDate);
  }

  function updateGolfTeeTime(nextTime: string) {
    setStartTime(nextTime);
    if (nextTime && roundDurationMinutes) {
      const startMinutes = timeToMinutes(nextTime);
      const duration = Number(roundDurationMinutes);
      if (startMinutes != null && Number.isFinite(duration)) {
        setEndTime(minutesToTime(startMinutes + duration));
      }
    } else if (nextTime && endTime) {
      setRoundDurationMinutes(durationFromTimes(nextTime, endTime));
    }
  }

  function updateGolfDuration(nextDuration: string) {
    setRoundDurationMinutes(nextDuration);
    if (startTime && nextDuration) {
      const startMinutes = timeToMinutes(startTime);
      const duration = Number(nextDuration);
      if (startMinutes != null && Number.isFinite(duration)) {
        setEndTime(minutesToTime(startMinutes + duration));
      }
    }
  }

  function updateGolfExpectedEnd(nextTime: string) {
    setEndTime(nextTime);
    if (startTime && nextTime) {
      setRoundDurationMinutes(durationFromTimes(startTime, nextTime));
    }
  }

  function updateReturnToHotelMode(nextMode: ReturnToHotelMode) {
    setReturnToHotelMode(nextMode);
    if (nextMode === "after_round") setReturnToHotel("After round");
    if (nextMode === "own_transport") setReturnToHotel("Own transport");
    if (nextMode === "custom") setReturnToHotel("");
    if (nextMode === "") setReturnToHotel("");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTrip() {
      if (!tripId || !token) return;

      try {
        const res = await fetch(
          `${API_BASE}/trips/${encodeURIComponent(tripId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        const members = Array.isArray(data?.members) ? data.members : [];
        setTrip({ members });
        setParticipantMemberIds(members.map((member: TripMember) => member.id));
        setVisibleToMemberIds(members.map((member: TripMember) => member.id));
      } catch {
        if (!cancelled) setTrip(null);
      }
    }

    loadTrip();

    return () => {
      cancelled = true;
    };
  }, [token, tripId]);

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

    if (!type || (!isGolfRound && !isFlight && !title.trim()) || !date) {
      setErr("Type, title, and date are required.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const normalizedEndDate =
        !isGolfRound && endDate && date && endDate < date ? date : endDate;
      const itemAmount = optionalNumber(amount);
      const payload = {
        type,
        title: isGolfRound
          ? derivedGolfTitle
          : isFlight
            ? flightTitle(flightNumber)
            : title.trim(),
        date,
        endDate: isGolfRound ? undefined : optionalText(normalizedEndDate),
        startTime: isHotel ? undefined : optionalText(startTime),
        endTime: isHotel ? undefined : optionalText(endTime),
        departureFromHotelTime: isGolfRound
          ? optionalText(departureFromHotelTime)
          : undefined,
        roundDurationMinutes: isGolfRound
          ? optionalNumber(roundDurationMinutes)
          : undefined,
        returnToHotel: isGolfRound ? optionalText(returnToHotel) : undefined,
        provider: optionalText(provider),
        bookingRef: isFlight ? optionalText(bookingRef) : undefined,
        notes: optionalText(notes),
        greenFee: type === "golf_round" ? optionalNumber(greenFee) : undefined,
        caddyFee: type === "golf_round" ? optionalNumber(caddyFee) : undefined,
        cartFee: type === "golf_round" ? optionalNumber(cartFee) : undefined,
        includeGreenFeeInSplit:
          type === "golf_round" ? includeGreenFeeInSplit : undefined,
        includeCaddyFeeInSplit:
          type === "golf_round" ? includeCaddyFeeInSplit : undefined,
        includeCartFeeInSplit:
          type === "golf_round" ? includeCartFeeInSplit : undefined,
        directPrice: isFlight ? undefined : optionalNumber(directPrice),
        providerPrice:
          isGolfRound || isHotel || isFlight
            ? undefined
            : optionalNumber(providerPrice),
        amount: isFlight ? undefined : itemAmount,
        currency: isFlight ? undefined : optionalText(currency),
        exchangeRate: isFlight || itemAmount === undefined ? undefined : 1,
        baseAmount: isFlight ? undefined : itemAmount,
        locationName: isFlight ? optionalText(fromAirport) : undefined,
        address: isFlight ? optionalText(toAirport) : undefined,
        courseId: type === "golf_round" ? selectedCourse?.id : undefined,
        paidByMemberId: isFlight ? undefined : optionalText(paidByMemberId),
        participantMemberIds,
        visibility,
        visibleToMemberIds:
          visibility === "SELECTED" ? visibleToMemberIds : undefined,
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

  const actionButtonStyle: CSSProperties = {
    width: "100%",
    minHeight: 46,
    borderRadius: 999,
    border: `1px solid ${theme.color}`,
    background: "var(--text)",
    color: "var(--bg)",
    cursor: saving ? "default" : "pointer",
    fontWeight: 950,
    fontSize: 14,
  };

  const secondaryButtonStyle: CSSProperties = {
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--sub)",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  };

  const renderTypeSelector = (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        padding: "1px 2px 6px",
        margin: "0 -2px",
      }}
    >
      {typeOptions.map((option) => {
        const optionTheme = itemTheme(option.value);
        const selected = option.value === type;
        const Icon = itemIcon(option.value);

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setType(option.value)}
            style={{
              flex: "0 0 122px",
              minHeight: 74,
              padding: 10,
              borderRadius: 16,
              border: selected
                ? `2px solid ${optionTheme.color}`
                : "1px solid var(--border)",
              background: selected ? optionTheme.soft : "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
              textAlign: "left",
              display: "grid",
              gap: 7,
              alignContent: "space-between",
              boxShadow: selected
                ? "0 8px 20px rgba(0,0,0,0.09)"
                : "0 5px 14px rgba(0,0,0,0.045)",
            }}
          >
            <Icon size={19} strokeWidth={2.3} style={{ color: optionTheme.color }} />
            <span style={{ fontSize: 13, fontWeight: 950, lineHeight: 1.12 }}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderCourseSearch = isGolfRound ? (
    <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
      <label style={labelStyle}>
        Course
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

      {courseLoading ? (
        <div style={{ color: "var(--sub)", fontSize: 13 }}>Searching...</div>
      ) : null}

      {courseResults.length > 0 ? (
        <div style={{ display: "grid", gap: 7 }}>
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
                minHeight: 54,
                textAlign: "left",
                border: "1px solid var(--border)",
                borderRadius: 14,
                background: "var(--card)",
                color: "var(--text)",
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 950, overflowWrap: "anywhere" }}>
                {course.name}
              </div>
              <div style={{ color: "var(--sub)", fontSize: 12 }}>
                {[course.region, course.country].filter(Boolean).join(", ")}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  const renderDateFields = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <label style={{ ...labelStyle, flex: "1 1 160px", minWidth: 0 }}>
        {isFlight ? "Departure date" : isHotel ? "Check-in" : "Date"}
        <input
          type="date"
          value={date}
          onChange={(e) => updateDate(e.target.value)}
          required
          style={fieldStyle}
        />
      </label>

      {!isGolfRound ? (
        <label style={{ ...labelStyle, flex: "1 1 160px", minWidth: 0 }}>
          {isFlight ? "Arrival date" : "End date"}
          <input
            type="date"
            value={endDate}
            min={date || undefined}
            onChange={(e) => updateEndDate(e.target.value)}
            style={fieldStyle}
          />
          {dateRangeTypes.has(type) ? (
            <span style={{ color: "var(--sub)", fontSize: 12 }}>
              Optional for multi-day plans.
            </span>
          ) : null}
        </label>
      ) : null}
    </div>
  );

  const renderGolfTimingFields = (
    <>
      <label style={labelStyle}>
        Tee time
        <input
          type="time"
          value={startTime}
          onChange={(e) => updateGolfTeeTime(e.target.value)}
          style={{
            ...fieldStyle,
            minHeight: 50,
            fontSize: 21,
            fontWeight: 950,
            borderColor: theme.color,
            background: "var(--card)",
          }}
        />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <label style={{ ...labelStyle, flex: "1 1 140px", minWidth: 0 }}>
          Duration
          <select
            value={roundDurationMinutes}
            onChange={(e) => updateGolfDuration(e.target.value)}
            style={fieldStyle}
          >
            {visibleGolfDurationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ ...labelStyle, flex: "1 1 140px", minWidth: 0 }}>
          Expected end
          <input
            type="time"
            value={endTime}
            onChange={(e) => updateGolfExpectedEnd(e.target.value)}
            style={fieldStyle}
          />
        </label>
      </div>
    </>
  );

  const renderNonGolfTimeFields = !isHotel ? (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <label style={{ ...labelStyle, flex: "1 1 150px", minWidth: 0 }}>
        {isFlight ? "Departure time" : "Start time"}
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ ...labelStyle, flex: "1 1 150px", minWidth: 0 }}>
        {isFlight ? "Arrival time" : "End time"}
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          style={fieldStyle}
        />
      </label>
    </div>
  ) : null;

  const renderTransportTiming = isGolfRound ? (
    <Card
      title="Transport Timing"
      subtitle="Plan the hotel departure now. A transport item can be linked later."
    >
      <label style={labelStyle}>
        Departure from hotel
        <input
          type="time"
          value={departureFromHotelTime}
          onChange={(e) => setDepartureFromHotelTime(e.target.value)}
          style={fieldStyle}
        />
      </label>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 900 }}>
          Return to hotel
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {[
            { mode: "after_round", label: "After round" },
            { mode: "custom", label: "Custom time" },
            { mode: "own_transport", label: "Own transport" },
          ].map((option) => {
            const selected = returnToHotelMode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() =>
                  updateReturnToHotelMode(option.mode as ReturnToHotelMode)
                }
                style={{
                  minHeight: 38,
                  padding: "0 11px",
                  borderRadius: 999,
                  border: selected ? `1px solid ${theme.color}` : "1px solid var(--border)",
                  background: selected ? theme.soft : "transparent",
                  color: selected ? "var(--text)" : "var(--sub)",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {returnToHotelMode === "custom" ? (
          <label style={labelStyle}>
            Return time
            <input
              type="time"
              value={returnToHotel}
              onChange={(e) => setReturnToHotel(e.target.value)}
              style={fieldStyle}
            />
          </label>
        ) : null}
      </div>
    </Card>
  ) : null;

  const renderDetails = (
    <Card
      title="Booked Via"
      subtitle={isGolfRound ? "Keep the round source clear." : "Add the provider or booking source."}
    >
      {!isFlight ? (
        <label style={labelStyle}>
          {isGolfRound || isHotel ? "Booked via / booked by" : "Provider"}
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder={
              isGolfRound
                ? "Direct at golf course, hotel concierge, Golfasian"
                : isHotel
                  ? "Direct at hotel, Booking.com, Agoda"
                  : undefined
            }
            style={fieldStyle}
          />
        </label>
      ) : (
        <label style={labelStyle}>
          Booking reference
          <input
            value={bookingRef}
            onChange={(e) => setBookingRef(e.target.value)}
            placeholder="Booking reference"
            style={fieldStyle}
          />
        </label>
      )}
      <label style={labelStyle}>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isHotel ? "Breakfast, room details or cancellation notes" : "Optional notes"}
          rows={4}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </label>
    </Card>
  );

  const renderCosts = (
    <Card title="Costs" subtitle="Keep shared costs simple.">
      {!isFlight ? (
        <label style={labelStyle}>
          Amount
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={fieldStyle}
          />
        </label>
      ) : null}

      {isGolfRound ? (
        <>
          {[
            {
              label: "Greenfee",
              value: greenFee,
              onAmountChange: setGreenFee,
              checked: includeGreenFeeInSplit,
              onCheckedChange: setIncludeGreenFeeInSplit,
            },
            {
              label: "Caddyfee",
              value: caddyFee,
              onAmountChange: setCaddyFee,
              checked: includeCaddyFeeInSplit,
              onCheckedChange: setIncludeCaddyFeeInSplit,
            },
            {
              label: "Cartfee",
              value: cartFee,
              onAmountChange: setCartFee,
              checked: includeCartFeeInSplit,
              onCheckedChange: setIncludeCartFeeInSplit,
            },
          ].map((cost) => (
            <div key={cost.label} style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>
                {cost.label}
                <input
                  type="number"
                  inputMode="decimal"
                  value={cost.value}
                  onChange={(e) => cost.onAmountChange(e.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: 38,
                  gap: 8,
                  color: "var(--sub)",
                  fontSize: 12,
                  fontWeight: 850,
                }}
              >
                <input
                  type="checkbox"
                  checked={cost.checked}
                  onChange={(e) => cost.onCheckedChange(e.target.checked)}
                />
                Include in group total
              </label>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 950,
            }}
          >
            <span>Organizer total</span>
            <span>{organizerTotal.toLocaleString()}</span>
          </div>
        </>
      ) : !isFlight ? (
        <>
          <label style={labelStyle}>
            {isHotel ? "Amount per day" : "Direct price"}
            <input
              type="number"
              inputMode="decimal"
              value={directPrice}
              onChange={(e) => setDirectPrice(e.target.value)}
              style={fieldStyle}
            />
          </label>
          {!isHotel ? (
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
          ) : null}
        </>
      ) : (
        <div style={sectionIntroStyle}>Flights do not use shared trip costs yet.</div>
      )}

      {!isFlight ? (
        <label style={labelStyle}>
          Currency
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={fieldStyle}
          >
            {currencyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {(trip?.members ?? []).length > 0 && !isFlight ? (
        <label style={labelStyle}>
          Paid by
          <select
            value={paidByMemberId}
            onChange={(e) => setPaidByMemberId(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Not specified</option>
            {(trip?.members ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {memberDisplayName(member)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </Card>
  );

  const renderVisibility = (
    <Card title="Visibility" subtitle="Choose who can see this item.">
      <div style={{ display: "grid", gap: 8 }}>
        {visibilityOptions.map((option) => {
          const selected = visibility === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setVisibility(option.value)}
              style={{
                width: "100%",
                minHeight: 48,
                padding: "0 13px",
                borderRadius: 14,
                border: selected ? `1px solid ${theme.color}` : "1px solid var(--border)",
                background: selected ? theme.soft : "transparent",
                color: "var(--text)",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: selected ? 950 : 850,
                fontSize: 13,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {visibility === "SELECTED" && (trip?.members ?? []).length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          {(trip?.members ?? []).map((member) => {
            const checked = visibleToMemberIds.includes(member.id);
            return (
              <label
                key={member.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: 34,
                  gap: 8,
                  color: "var(--text)",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setVisibleToMemberIds((current) =>
                      e.target.checked
                        ? [...current, member.id]
                        : current.filter((id) => id !== member.id),
                    );
                  }}
                />
                <span>{memberDisplayName(member)}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </Card>
  );

  const renderParticipants = (trip?.members ?? []).length > 0 ? (
    <Card title="Participants" subtitle="Choose who is part of this item.">
      <div style={{ display: "grid", gap: 6 }}>
        {(trip?.members ?? []).map((member) => {
          const checked = participantMemberIds.includes(member.id);
          return (
            <label
              key={member.id}
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: 34,
                gap: 8,
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  setParticipantMemberIds((current) =>
                    e.target.checked
                      ? [...current, member.id]
                      : current.filter((id) => id !== member.id),
                  );
                }}
              />
              <span>{memberDisplayName(member)}</span>
            </label>
          );
        })}
      </div>
    </Card>
  ) : null;

  const renderPlanningHero = (
    <section
      style={{
        display: "grid",
        gap: 10,
        padding: 14,
        borderRadius: 20,
        border: `1px solid color-mix(in srgb, ${theme.color} 42%, var(--border))`,
        background: `linear-gradient(135deg, ${theme.soft}, transparent 72%), var(--card)`,
        boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <div
          aria-hidden="true"
          style={{
            width: 46,
            height: 46,
            borderRadius: 16,
            background: theme.soft,
            color: theme.color,
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
          }}
        >
          <HeroIcon size={25} strokeWidth={2.25} />
        </div>
        <div style={{ display: "grid", gap: isGolfRound && selectedCourse ? 5 : 3, minWidth: 0 }}>
          {isGolfRound && !selectedCourse ? (
            <>
              <div
                style={{
                  color: "var(--text)",
                  fontSize: 21,
                  lineHeight: 1.08,
                  fontWeight: 950,
                }}
              >
                Choose a golf course
              </div>
            </>
          ) : (
            <>
              {!isGolfRound ? (
                <div
                  style={{
                    color: theme.color,
                    fontSize: 13,
                    lineHeight: 1.2,
                    fontWeight: 950,
                  }}
                >
                  {itemNoun(type)}
                </div>
              ) : null}
              <div
                style={{
                  color: "var(--text)",
                  fontSize: 21,
                  lineHeight: 1.08,
                  fontWeight: 950,
                  overflowWrap: "anywhere",
                }}
              >
                {summaryTitle}
              </div>
            </>
          )}
          {isGolfRound && selectedCourseLocation ? (
            <div style={{ color: "var(--sub)", fontSize: 13, fontWeight: 850 }}>
              {selectedCourseLocation}
            </div>
          ) : null}
          {isGolfRound && selectedCourse ? (
            <div
              style={{
                display: "grid",
                gap: 3,
                color: "var(--sub)",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              <span>{formatPlanDate(date)}</span>
              <span>{startTime ? `${startTime} Tee Time` : "Set tee time"}</span>
            </div>
          ) : !isGolfRound ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                color: "var(--sub)",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              <span>{formatPlanDate(date)}</span>
              <span>{startTime || "Set time"}</span>
            </div>
          ) : null}
        </div>
      </div>
      {isGolfRound ? (
        <div>
          {renderCourseSearch}
        </div>
      ) : null}
    </section>
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        boxSizing: "border-box",
        overflowX: "hidden",
        padding: "12px 14px calc(92px + env(safe-area-inset-bottom, 0px))",
        display: "grid",
        gap: 12,
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--card) 92%, transparent), transparent 180px)",
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => (step === 1 ? nav(`/trips/${tripId}`) : setStep(1))}
            style={secondaryButtonStyle}
          >
            {step === 1 ? "Back to Trip" : "Back to Step 1"}
          </button>
          <div
            style={{
              minHeight: 32,
              padding: "0 10px",
              borderRadius: 999,
              border: `1px solid ${theme.color}`,
              background: theme.soft,
              color: "var(--text)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 950,
              whiteSpace: "nowrap",
            }}
          >
            {step} / 2
          </div>
        </div>
        <div style={{ display: "grid", gap: 3 }}>
          <div style={{ color: theme.color, fontSize: 12, fontWeight: 950 }}>
            {step === 1 ? "Plan your round" : "Travel & costs"}
          </div>
          <div style={{ fontSize: 24, lineHeight: 1.05, fontWeight: 950 }}>
            {pageTitle}
          </div>
          <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.4 }}>
            {step === 1
              ? "Pick the trip item and anchor the plan."
              : "Add the travel details, visibility and shared costs."}
          </div>
        </div>
      </div>

      {err ? (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 13,
            boxSizing: "border-box",
          }}
        >
          {err}
        </div>
      ) : null}

      <form onSubmit={submit} style={{ display: "grid", gap: 11 }}>
        {step === 1 ? (
          <>
            <SectionHeader title="Item Type" subtitle="Choose the kind of plan you are adding." />
            {renderTypeSelector}
            {renderPlanningHero}
            {isGolfRound ? null : (
              <Card title="Basic Info" subtitle="Add the main details.">
                {!isFlight ? (
                  <label style={labelStyle}>
                    {isHotel ? "Hotel name" : "Title"}
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      style={fieldStyle}
                    />
                  </label>
                ) : (
                  <>
                    <label style={labelStyle}>
                      Flight number
                      <input
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value)}
                        placeholder="TG971"
                        style={fieldStyle}
                      />
                    </label>
                    <label style={labelStyle}>
                      Airline
                      <input
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        placeholder="Thai Airways"
                        style={fieldStyle}
                      />
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <label style={{ ...labelStyle, flex: "1 1 150px", minWidth: 0 }}>
                        From
                        <input
                          value={fromAirport}
                          onChange={(e) => setFromAirport(e.target.value)}
                          placeholder="ZRH"
                          style={fieldStyle}
                        />
                      </label>
                      <label style={{ ...labelStyle, flex: "1 1 150px", minWidth: 0 }}>
                        To
                        <input
                          value={toAirport}
                          onChange={(e) => setToAirport(e.target.value)}
                          placeholder="BKK"
                          style={fieldStyle}
                        />
                      </label>
                    </div>
                  </>
                )}
              </Card>
            )}

            <Card
              title={isGolfRound ? "Date & Tee Time" : "Date & Time"}
              subtitle={isGolfRound ? "Tee time anchors the round." : "Set the trip timeline."}
            >
              {renderDateFields}
              {isGolfRound ? (
                <label style={labelStyle}>
                  Tee time
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => updateGolfTeeTime(e.target.value)}
                    style={{
                      ...fieldStyle,
                      minHeight: 50,
                      fontSize: 21,
                      fontWeight: 950,
                      borderColor: theme.color,
                      background: "var(--card)",
                    }}
                  />
                </label>
              ) : (
                renderNonGolfTimeFields
              )}
            </Card>

            <div
              style={{
                position: "sticky",
                bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
                padding: 8,
                borderRadius: 18,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--card) 94%, transparent)",
                boxShadow: "0 12px 34px rgba(0,0,0,0.18)",
              }}
            >
              <button
                type="button"
                onClick={() => setStep(2)}
                style={actionButtonStyle}
              >
                Next: Travel & costs
              </button>
            </div>
          </>
        ) : (
          <>
            <Card
              title="Time & Timing"
              subtitle={isGolfRound ? "Fine tune the round window." : "Review the itinerary timing."}
            >
              {renderDateFields}
              {isGolfRound ? renderGolfTimingFields : renderNonGolfTimeFields}
            </Card>

            {renderTransportTiming}
            {renderDetails}
            {renderParticipants}
            {renderVisibility}
            {renderCosts}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                position: "sticky",
                bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
                padding: 8,
                borderRadius: 18,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--card) 94%, transparent)",
                boxShadow: "0 12px 34px rgba(0,0,0,0.18)",
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={saving}
                style={{
                  ...secondaryButtonStyle,
                  flex: "1 1 120px",
                  minHeight: 46,
                  color: "var(--text)",
                }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ ...actionButtonStyle, flex: "2 1 180px" }}
              >
                {saving ? "Saving..." : itemCta(type)}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
