import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const typeOptions: { value: TripItemType; label: string }[] = [
  { value: "golf_round", label: "Golf round" },
  { value: "hotel", label: "Hotel" },
  { value: "transfer", label: "Transfer" },
  { value: "car_rental", label: "Car rental" },
  { value: "flight", label: "Flight" },
  { value: "free_day", label: "Free day" },
  { value: "note", label: "Note" },
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
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  padding: "10px 12px",
  font: "inherit",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 900,
  color: "var(--text)",
};

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

  const [type, setType] = useState<TripItemType>("golf_round");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
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
  const [currency, setCurrency] = useState("CHF");
  const [courseQuery, setCourseQuery] = useState("");
  const [courseResults, setCourseResults] = useState<CourseSearchResult[]>([]);
  const [selectedCourse, setSelectedCourse] =
    useState<CourseSearchResult | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participantMemberIds, setParticipantMemberIds] = useState<string[]>([]);
  const [paidByMemberId, setPaidByMemberId] = useState("");
  const [courseLoading, setCourseLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isGolfRound = type === "golf_round";
  const isHotel = type === "hotel";
  const isFlight = type === "flight";
  const derivedGolfTitle = selectedCourse?.name || "Golf round";
  const organizerTotal =
    (includeGreenFeeInSplit ? amountValue(greenFee) : 0) +
    (includeCaddyFeeInSplit ? amountValue(caddyFee) : 0) +
    (includeCartFeeInSplit ? amountValue(cartFee) : 0);

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

      const payload = {
        type,
        title: isGolfRound
          ? derivedGolfTitle
          : isFlight
            ? flightTitle(flightNumber)
            : title.trim(),
        date,
        endDate: isGolfRound ? undefined : optionalText(endDate),
        startTime: isHotel ? undefined : optionalText(startTime),
        endTime: isHotel ? undefined : optionalText(endTime),
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
        currency: isFlight ? undefined : optionalText(currency),
        locationName: isFlight ? optionalText(fromAirport) : undefined,
        address: isFlight ? optionalText(toAirport) : undefined,
        courseId: type === "golf_round" ? selectedCourse?.id : undefined,
        paidByMemberId: isFlight ? undefined : optionalText(paidByMemberId),
        participantMemberIds,
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

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        boxSizing: "border-box",
        overflowX: "hidden",
        padding: "16px 16px calc(96px + env(safe-area-inset-bottom, 0px))",
        display: "grid",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 4,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={() => nav(`/trips/${tripId}`)}
          style={{
            width: "fit-content",
            height: 32,
            padding: "0 12px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--sub)",
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          Back to Trip
        </button>
        <div style={{ fontSize: 22, lineHeight: 1.15, fontWeight: 950 }}>
          Add Item
        </div>
        <div style={{ fontSize: 13, color: "var(--sub)" }}>
          Add a simple timeline item to this trip
        </div>
      </div>

      {err ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
          color: "var(--text)",
          fontSize: 13,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
          {err}
        </div>
      ) : null}

      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          display: "grid",
          gap: 14,
          padding: 14,
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--card)",
          overflow: "hidden",
        }}
      >
        <label style={labelStyle}>
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TripItemType)}
            required
            style={fieldStyle}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isGolfRound ? (
          <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
            <label style={labelStyle}>
              Search golf course
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

            {selectedCourse ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontSize: 13,
                  fontWeight: 800,
                  boxSizing: "border-box",
                  maxWidth: "100%",
                }}
              >
                Selected: {selectedCourse.name}
              </div>
            ) : null}

            {courseLoading ? (
              <div style={{ color: "var(--sub)", fontSize: 13 }}>
                Searching...
              </div>
            ) : null}

            {courseResults.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 6,
                  background: "var(--bg)",
                  boxSizing: "border-box",
                  maxWidth: "100%",
                }}
              >
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
                      textAlign: "left",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      background: "var(--card)",
                      color: "var(--text)",
                      padding: "10px 12px",
                      cursor: "pointer",
                      minWidth: 0,
                      maxWidth: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ fontWeight: 900, overflowWrap: "anywhere" }}>
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
        ) : null}

        {isGolfRound ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--sub)",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Title will be saved as{" "}
            <span style={{ color: "var(--text)", fontWeight: 950 }}>
              {derivedGolfTitle}
            </span>
          </div>
        ) : isFlight ? (
          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
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
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 0 }}>
                From airport
                <input
                  value={fromAirport}
                  onChange={(e) => setFromAirport(e.target.value)}
                  placeholder="ZRH"
                  style={fieldStyle}
                />
              </label>
              <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 0 }}>
                To airport
                <input
                  value={toAirport}
                  onChange={(e) => setToAirport(e.target.value)}
                  placeholder="BKK"
                  style={fieldStyle}
                />
              </label>
            </div>
          </div>
        ) : (
          <label style={labelStyle}>
            {isHotel ? "Hotel name" : "Title"}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={fieldStyle}
            />
          </label>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 0 }}>
            {isFlight ? "Departure date" : isHotel ? "Check-in date" : "Date"}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={fieldStyle}
            />
          </label>

          {!isGolfRound ? (
            <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 0 }}>
              {isFlight ? "Arrival date" : "End date"}
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={fieldStyle}
              />
              {dateRangeTypes.has(type) ? (
                <span style={{ color: "var(--sub)", fontSize: 12 }}>
                  {isFlight
                    ? "Optional for overnight or connecting flights"
                    : isHotel
                    ? "Optional for multi-day stays"
                    : "Optional for multi-day stays or rentals"}
                </span>
              ) : null}
            </label>
          ) : null}
        </div>

        {!isHotel ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 0 }}>
                                  {isFlight ? "Departure time" : "Start time"}
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={fieldStyle}
              />
            </label>
            <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 0 }}>
                                  {isFlight ? "Arrival time" : "End time"}
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={fieldStyle}
              />
            </label>
          </div>
        ) : null}

        {!isFlight ? (
        <label style={labelStyle}>
          {isGolfRound || isHotel ? "Booked via / booked by" : "Provider"}
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder={
              isGolfRound
                ? "Direct at golf course, Golfasian, Hotel concierge, Beda"
                : isHotel
                  ? "Direct at hotel, Booking.com, Hotels.com, Agoda, Ebookers, Beda"
                : undefined
            }
            style={fieldStyle}
          />
        </label>
        ) : null}

        {isFlight ? (
          <label style={labelStyle}>
            Booking reference
            <input
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value)}
              placeholder="Booking reference"
              style={fieldStyle}
            />
          </label>
        ) : null}

        {isGolfRound ? (
          <div
            style={{
              display: "grid",
              gap: 10,
              padding: 10,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <div
              style={{
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              Golf costs
            </div>
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
              <div
                key={cost.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: 6,
                }}
              >
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
                paddingTop: 2,
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 950,
              }}
            >
              <span>Organizer total</span>
              <span>{organizerTotal.toLocaleString()}</span>
            </div>
          </div>
        ) : null}

        {!isGolfRound && !isFlight ? (
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
              {isHotel ? (
                <span style={{ color: "var(--sub)", fontSize: 12 }}>
                  Use notes for breakfast included, room details or price comparisons.
                </span>
              ) : null}
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
        ) : null}

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

        {(trip?.members ?? []).length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: 10,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <div
              style={{
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              Participants
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {(trip?.members ?? []).map((member) => {
                const checked = participantMemberIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
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
          </div>
        ) : null}

        <label style={labelStyle}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isHotel
                ? "Breakfast included/excluded, direct vs provider comparison, room type, cancellation details"
                : undefined
            }
            rows={4}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </label>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            onClick={() => nav(`/trips/${tripId}`)}
            disabled={saving}
            style={{
              flex: "1 1 140px",
              height: 42,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor: saving ? "default" : "pointer",
              fontWeight: 900,
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              flex: "1 1 140px",
              height: 42,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--text)",
              color: "var(--bg)",
              cursor: saving ? "default" : "pointer",
              fontWeight: 900,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
