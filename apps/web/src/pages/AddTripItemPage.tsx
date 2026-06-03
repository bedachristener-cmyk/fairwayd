import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BedDouble,
  Bus,
  Car,
  Flag,
  Plane,
  StickyNote,
  Utensils,
} from "lucide-react";
import { API_BASE } from "../api/base";
import { friendlyApiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type TripItemType =
  | "golf_round"
  | "hotel"
  | "transfer"
  | "car_rental"
  | "flight"
  | "restaurant"
  | "free_day"
  | "note";

type TripItemVisibility = "GROUP" | "SELECTED" | "PRIVATE";
type ReturnToHotelMode = "" | "after_round" | "custom" | "own_transport";
type CostMode = "PER_PERSON" | "TOTAL";
type PaymentMode = "PAID_BY_ONE" | "EACH_PAYS_OWN";

type BudgetCostDraft = {
  localId: string;
  label: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  baseAmount: string;
  costMode: CostMode;
  paymentMode: PaymentMode;
  paidByMemberId: string;
  participantMemberIds: string[];
};

type FormStep = 1 | 2;

const typeOptions: { value: TripItemType; label: string }[] = [
  { value: "golf_round", label: "Golf round" },
  { value: "hotel", label: "Hotel" },
  { value: "transfer", label: "Transfer" },
  { value: "car_rental", label: "Car rental" },
  { value: "flight", label: "Flight" },
  { value: "restaurant", label: "Restaurant" },
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
  userId?: string | null;
  displayName?: string | null;
  isGuest?: boolean;
  role?: "OWNER" | "ADMIN" | "MEMBER";
  user?: {
    id?: string | null;
    name?: string | null;
    handle?: string | null;
  } | null;
};

type TripDocument = {
  id: string;
  tripId?: string;
  title: string;
  note?: string | null;
  category?: string;
  fileName: string;
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  visibility?: "SHARED" | "PRIVATE";
};

type Trip = {
  baseCurrency?: string | null;
  members?: TripMember[];
  documents?: TripDocument[];
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
  gap: 9,
  padding: 12,
  borderRadius: 17,
  border: "1px solid color-mix(in srgb, var(--border) 58%, transparent)",
  background: "var(--card)",
  boxShadow: "0 7px 18px rgba(0,0,0,0.05)",
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
        borderLeft: "4px solid var(--item-accent, var(--accent-strong))",
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
  if (type === "transfer") {
    return { color: "#b86f16", soft: "rgba(184, 111, 22, 0.09)" };
  }
  if (type === "car_rental") {
    return { color: "#2f6fb9", soft: "rgba(47, 111, 185, 0.09)" };
  }
  if (type === "flight") return { color: "#2f91d8", soft: "rgba(47, 145, 216, 0.08)" };
  if (type === "restaurant") return { color: "#d15f32", soft: "rgba(209, 95, 50, 0.09)" };
  return { color: "#7467b8", soft: "rgba(116, 103, 184, 0.08)" };
}

function itemTitle(type: TripItemType) {
  if (type === "golf_round") return "Add Golf Round";
  if (type === "hotel") return "Add Hotel";
  if (type === "transfer") return "Add Transfer";
  if (type === "car_rental") return "Add Car Rental";
  if (type === "flight") return "Add Flight";
  if (type === "restaurant") return "Add Restaurant";
  if (type === "free_day") return "Add Activity";
  return "Add Note";
}

function itemNoun(type: TripItemType) {
  if (type === "golf_round") return "Golf Round";
  if (type === "hotel") return "Hotel";
  if (type === "transfer") return "Transfer";
  if (type === "car_rental") return "Car rental";
  if (type === "flight") return "Flight";
  if (type === "restaurant") return "Restaurant";
  if (type === "free_day") return "Activity";
  return "Note";
}

function itemSubtitle(type: TripItemType) {
  if (type === "transfer") return "Airport, hotel or golf transport";
  if (type === "car_rental") return "Vehicle, minibus or driver";
  if (type === "restaurant") return "Dinner, drinks or group meals";
  return "";
}

function itemCta(type: TripItemType) {
  if (type === "golf_round") return "Add Golf Round";
  if (type === "hotel") return "Add Hotel";
  if (type === "transfer") return "Add Transfer";
  if (type === "car_rental") return "Add Car Rental";
  if (type === "flight") return "Add Flight";
  if (type === "restaurant") return "Add Restaurant";
  if (type === "free_day") return "Add Activity";
  return "Add Note";
}

function itemIcon(type: TripItemType) {
  if (type === "golf_round") return Flag;
  if (type === "hotel") return BedDouble;
  if (type === "transfer") return Bus;
  if (type === "car_rental") return Car;
  if (type === "flight") return Plane;
  if (type === "restaurant") return Utensils;
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

function validDateParam(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function dateFromInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateInputFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDaysToInputDate(value: string, days: number) {
  const date = dateFromInput(value);
  if (!date || !Number.isFinite(days)) return "";

  date.setUTCDate(date.getUTCDate() + days);
  return dateInputFromDate(date);
}

function nightsBetweenDates(checkIn: string, checkOut: string) {
  const start = dateFromInput(checkIn);
  const end = dateFromInput(checkOut);
  if (!start || !end) return "";

  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  return days > 0 ? String(days) : "";
}

async function tripItemSaveError(res: Response) {
  const text = await res.text().catch(() => "");
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  const serverMessage = data?.message;
  const detail = Array.isArray(serverMessage)
    ? serverMessage.join(" ")
    : typeof serverMessage === "string"
      ? serverMessage
      : text;
  const message = detail || `Save failed (${res.status} ${res.statusText})`;
  const error = new Error(message);
  (error as Error & { status?: number; data?: unknown }).status = res.status;
  (error as Error & { status?: number; data?: unknown }).data = data;
  return error;
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

function formatMoney(value?: number | null, currency?: string | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const code = currency?.trim() || "CHF";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value} ${code}`.trim();
  }
}

function defaultCostModeForItemType(type: TripItemType): CostMode {
  if (type === "golf_round" || type === "flight") return "PER_PERSON";
  return "TOTAL";
}

function defaultPaymentModeForItemType(type: TripItemType): PaymentMode {
  if (type === "golf_round" || type === "flight") return "EACH_PAYS_OWN";
  return "PAID_BY_ONE";
}

function costModeText(mode?: CostMode | null) {
  return mode === "PER_PERSON" ? "per person" : "total";
}

function costLabelExamplesForItemType(type: TripItemType) {
  if (type === "golf_round") return ["Package price", "Greenfee", "Caddy", "Cart"];
  if (type === "hotel") return ["Room", "Stay", "Breakfast", "Resort fee"];
  if (type === "flight") return ["Ticket", "Baggage", "Seat reservation"];
  if (type === "transfer" || type === "car_rental") {
    return ["Rental fee", "Fuel", "Parking", "Damage", "Toll", "Driver tip"];
  }
  if (type === "restaurant") return ["Dinner", "Drinks", "Tip"];
  if (type === "free_day") return ["Entry fee", "Tour", "Equipment"];
  return ["Cost name"];
}

function costLabelPlaceholderForItemType(type: TripItemType) {
  const examples = costLabelExamplesForItemType(type);
  return examples.length === 1 ? examples[0] : examples.join(", ");
}

export default function AddTripItemPage() {
  const { tripId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<FormStep>(1);
  const [type, setType] = useState<TripItemType>("golf_round");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hotelNights, setHotelNights] = useState("");
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
  const [courseQuery, setCourseQuery] = useState("");
  const [courseResults, setCourseResults] = useState<CourseSearchResult[]>([]);
  const [selectedCourse, setSelectedCourse] =
    useState<CourseSearchResult | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [budgetDrafts, setBudgetDrafts] = useState<BudgetCostDraft[]>([]);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [expandedBudgetCostId, setExpandedBudgetCostId] = useState<string | null>(null);
  const [documentUploadFile, setDocumentUploadFile] = useState<File | null>(null);
  const [documentUploadState, setDocumentUploadState] = useState<
    "idle" | "uploading" | "uploaded" | "failed"
  >("idle");
  const [documentUploadMessage, setDocumentUploadMessage] = useState("");
  const [visibility, setVisibility] = useState<TripItemVisibility>("GROUP");
  const [visibleToMemberIds, setVisibleToMemberIds] = useState<string[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const myMembership = trip?.members?.find((member) => member.userId === user?.id);
  const canCreateGroupItem =
    myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";
  const availableVisibilityOptions = canCreateGroupItem
    ? visibilityOptions
    : visibilityOptions.filter((option) => option.value === "PRIVATE");
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
    if (type === "hotel") {
      if (nextDate && hotelNights) {
        setEndDate(addDaysToInputDate(nextDate, Number(hotelNights)));
        return;
      }

      if (nextDate && endDate && endDate > nextDate) {
        const nextNights = nightsBetweenDates(nextDate, endDate);
        setHotelNights(nextNights);
      } else if (endDate && nextDate && endDate <= nextDate) {
        setEndDate("");
        setHotelNights("");
      }
      return;
    }

    setEndDate((currentEndDate) =>
      currentEndDate && nextDate && currentEndDate < nextDate
        ? nextDate
        : currentEndDate,
    );
  }

  function updateEndDate(nextEndDate: string) {
    if (type === "hotel") {
      const validEndDate = nextEndDate && date && nextEndDate <= date ? "" : nextEndDate;
      const nextNights = date && validEndDate ? nightsBetweenDates(date, validEndDate) : "";
      setEndDate(validEndDate);
      setHotelNights(nextNights);
      return;
    }

    setEndDate(nextEndDate && date && nextEndDate < date ? date : nextEndDate);
  }

  function updateHotelNights(nextNights: string) {
    const digitsOnly = nextNights.replace(/[^\d]/g, "");
    const normalizedNights = Number(digitsOnly) > 0 ? String(Number(digitsOnly)) : "";
    setHotelNights(normalizedNights);

    const nights = Number(normalizedNights);
    if (date && Number.isFinite(nights) && nights > 0) {
      setEndDate(addDaysToInputDate(date, nights));
    }
  }

  function updateType(nextType: TripItemType) {
    setType(nextType);
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

  function defaultBudgetParticipantIds() {
    if (!canCreateGroupItem && myMembership?.id) return [myMembership.id];
    return (trip?.members ?? []).map((member) => member.id);
  }

  function defaultBudgetPaidByMemberId() {
    if (myMembership?.id) return myMembership.id;
    return trip?.members?.[0]?.id || "";
  }

  function newBudgetDraft(): BudgetCostDraft {
    return {
      localId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label: "",
      amount: "",
      currency: trip?.baseCurrency || "CHF",
      exchangeRate: "",
      baseAmount: "",
      costMode: defaultCostModeForItemType(type),
      paymentMode: defaultPaymentModeForItemType(type),
      paidByMemberId: defaultBudgetPaidByMemberId(),
      participantMemberIds: defaultBudgetParticipantIds(),
    };
  }

  function updateBudgetDraft(
    localId: string,
    patch: Partial<BudgetCostDraft>,
  ) {
    setBudgetDrafts((drafts) =>
      drafts.map((draft) =>
        draft.localId === localId ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function addBudgetDraft() {
    const draft = newBudgetDraft();
    setBudgetDrafts((drafts) => [...drafts, draft]);
    setExpandedBudgetCostId(draft.localId);
  }

  function editBudgetDraft(localId: string) {
    setExpandedBudgetCostId(localId);
    setBudgetModalOpen(true);
  }

  function deleteBudgetDraft(localId: string) {
    setBudgetDrafts((drafts) => drafts.filter((draft) => draft.localId !== localId));
    setExpandedBudgetCostId((current) => (current === localId ? null : current));
  }

  function budgetPaymentText(draft: BudgetCostDraft) {
    if (draft.paymentMode === "EACH_PAYS_OWN") return "everyone pays own part";
    const paidBy = (trip?.members ?? []).find(
      (member) => member.id === draft.paidByMemberId,
    );
    return paidBy ? `paid by ${memberDisplayName(paidBy)}` : "paid by one member";
  }

  function budgetParticipantText(draft: BudgetCostDraft) {
    const count = draft.participantMemberIds.length;
    if (count === 0) return "";
    return `shared with ${count} ${count === 1 ? "person" : "people"}`;
  }

  function budgetAmountText(draft: BudgetCostDraft) {
    const amountValue = optionalNumber(draft.amount);
    return amountValue !== undefined
      ? formatMoney(amountValue, draft.currency)
      : "Amount not set";
  }

  function draftNeedsExchangeRate(draft: BudgetCostDraft) {
    const amount = optionalNumber(draft.amount);
    const baseCurrency = trip?.baseCurrency?.trim();
    const currency = draft.currency.trim();
    if (amount === undefined || amount <= 0) return false;
    if (!baseCurrency || !currency) return false;
    if (currency.toUpperCase() === baseCurrency.toUpperCase()) return false;
    if (optionalNumber(draft.baseAmount) !== undefined) return false;
    return optionalNumber(draft.exchangeRate) === undefined;
  }

  function budgetPayloadCosts() {
    const baseCurrency = trip?.baseCurrency?.trim();
    return budgetDrafts
      .map((draft) => {
        const amount = optionalNumber(draft.amount);
        const currency = optionalText(draft.currency);
        const isBaseCurrency =
          amount !== undefined &&
          currency &&
          baseCurrency &&
          currency.toUpperCase() === baseCurrency.toUpperCase();

        return {
          label: optionalText(draft.label),
          amount,
          currency,
          exchangeRate: optionalNumber(draft.exchangeRate) ?? (isBaseCurrency ? 1 : undefined),
          baseAmount: optionalNumber(draft.baseAmount) ?? (isBaseCurrency ? amount : undefined),
          costMode: draft.costMode,
          paymentMode: draft.paymentMode,
          paidByMemberId:
            draft.paymentMode === "PAID_BY_ONE"
              ? optionalText(draft.paidByMemberId)
              : undefined,
          participantMemberIds: draft.participantMemberIds,
        };
      })
      .filter(
        (cost) =>
          cost.label ||
          cost.amount !== undefined ||
          cost.baseAmount !== undefined,
      );
  }

  function validateBudgetCosts() {
    const costs = budgetPayloadCosts();
    if (costs.some((cost) => !cost.label || cost.amount === undefined)) {
      return "Each cost needs a label and amount.";
    }
    if (
      costs.some(
        (cost) => cost.paymentMode === "PAID_BY_ONE" && !cost.paidByMemberId,
      )
    ) {
      return "Choose who paid for each cost marked as one member paid.";
    }
    if (costs.some((cost) => cost.participantMemberIds.length === 0)) {
      return "Choose at least one member in Shared with for each cost.";
    }
    return "";
  }

  function saveBudgetDrafts() {
    const message = validateBudgetCosts();
    if (message) {
      setErr(message);
      return;
    }
    setErr(null);
    setBudgetModalOpen(false);
    setExpandedBudgetCostId(null);
  }

  function documentCategoryForType(): string {
    if (type === "golf_round") return "GOLF";
    if (type === "hotel") return "HOTEL";
    if (type === "transfer" || type === "car_rental") return "TRANSFER";
    if (type === "flight") return "FLIGHT";
    return "GENERAL";
  }

  function documentVisibilityForItem() {
    return visibility === "PRIVATE" ? "PRIVATE" : "SHARED";
  }

  async function uploadRelatedDocument() {
    if (!tripId || !token || !documentUploadFile || documentUploadState === "uploading") {
      return;
    }

    try {
      setDocumentUploadState("uploading");
      setDocumentUploadMessage("Uploading...");

      const form = new FormData();
      form.append("title", documentUploadFile.name);
      form.append("category", documentCategoryForType());
      form.append("visibility", documentVisibilityForItem());
      form.append("note", "Uploaded from trip item");
      form.append("file", documentUploadFile);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/documents`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status} ${res.statusText}) ${text}`.trim());
      }

      const document = (await res.json()) as TripDocument;
      setTrip((current) => ({
        ...(current ?? {}),
        documents: [document, ...(current?.documents ?? [])],
      }));
      setSelectedDocumentIds((current) =>
        current.includes(document.id) ? current : [...current, document.id],
      );
      setDocumentUploadFile(null);
      if (documentInputRef.current) documentInputRef.current.value = "";
      setDocumentUploadState("uploaded");
      setDocumentUploadMessage("Uploaded and linked.");
    } catch (e: any) {
      setDocumentUploadState("failed");
      setDocumentUploadMessage(e?.message || "Upload failed.");
    }
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
        const documents = Array.isArray(data?.documents) ? data.documents : [];
        setTrip({ baseCurrency: data?.baseCurrency, members, documents });
        const currentMember = members.find(
          (member: TripMember) => member.userId === user?.id,
        );
        const canCreateGroup =
          currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";
        setVisibility(canCreateGroup ? "GROUP" : "PRIVATE");
        setVisibleToMemberIds(
          canCreateGroup
            ? members.map((member: TripMember) => member.id)
            : currentMember?.id
              ? [currentMember.id]
              : [],
        );
      } catch {
        if (!cancelled) setTrip(null);
      }
    }

    loadTrip();

    return () => {
      cancelled = true;
    };
  }, [token, tripId, user?.id]);

  useEffect(() => {
    const dateParam = validDateParam(new URLSearchParams(location.search).get("date"));
    if (dateParam) updateDate(dateParam);
  }, [location.search]);

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

    if (isHotel && !endDate) {
      setErr("Check-in and check-out dates are required for hotel stays.");
      return;
    }

    const budgetValidationMessage = validateBudgetCosts();
    if (budgetValidationMessage) {
      setErr(budgetValidationMessage);
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const normalizedEndDate =
        !isGolfRound && endDate && date && endDate < date ? date : endDate;
      const costs = budgetPayloadCosts();
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
        locationName: isFlight ? optionalText(fromAirport) : undefined,
        address: isFlight ? optionalText(toAirport) : undefined,
        courseId: type === "golf_round" ? selectedCourse?.id : undefined,
        visibility,
        visibleToMemberIds:
          visibility === "SELECTED" ? visibleToMemberIds : undefined,
        documentIds: selectedDocumentIds,
        costs: costs.length > 0 ? costs : undefined,
      };

      console.info("Submitting trip item", {
        tripId,
        type,
        payload,
        selectedCourseId: selectedCourse?.id,
      });

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
        throw await tripItemSaveError(res);
      }

      nav(`/trips/${tripId}`);
    } catch (e: any) {
      console.error("Failed to save trip item", {
        status: e?.status,
        data: e?.data,
        message: e?.message,
        selectedCourseId: selectedCourse?.id,
      });
      setErr(
        friendlyApiErrorMessage(
          e,
          e?.message || "Failed to add trip item. Please check the form and try again.",
        ),
      );
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
        gap: 7,
        overflowX: "auto",
        padding: "1px 2px 4px",
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
            onClick={() => updateType(option.value)}
            style={{
              flex: "0 0 auto",
              minWidth: 108,
              minHeight: 58,
              padding: "8px 11px",
              borderRadius: 18,
              border: selected
                ? `2px solid ${optionTheme.color}`
                : "1px solid var(--border)",
              background: selected ? optionTheme.soft : "var(--card)",
              color: "var(--text)",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: selected
                ? "0 6px 16px rgba(0,0,0,0.08)"
                : "0 4px 12px rgba(0,0,0,0.04)",
            }}
          >
            <Icon
              size={18}
              strokeWidth={2.35}
              style={{ color: optionTheme.color, flex: "0 0 auto" }}
            />
            <span style={{ fontSize: 13, fontWeight: 950, lineHeight: 1.1 }}>
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

      {isHotel ? (
        <>
          <label style={{ ...labelStyle, flex: "0.75 1 110px", minWidth: 0 }}>
            Nights
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={hotelNights}
              onChange={(e) => updateHotelNights(e.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={{ ...labelStyle, flex: "1 1 160px", minWidth: 0 }}>
            Check-out
            <input
              type="date"
              value={endDate}
              min={date ? addDaysToInputDate(date, 1) : undefined}
              onChange={(e) => updateEndDate(e.target.value)}
              required
              style={fieldStyle}
            />
          </label>
        </>
      ) : !isGolfRound ? (
        <>
          <label style={{ ...labelStyle, flex: "1 1 160px", minWidth: 0 }}>
            {isFlight ? "Arrival date" : "End date"}
            <input
              type="date"
              value={endDate}
              min={date || undefined}
              onChange={(e) => updateEndDate(e.target.value)}
              style={fieldStyle}
            />
          </label>
          {dateRangeTypes.has(type) ? (
            <span
              style={{
                flex: "1 0 100%",
                color: "var(--sub)",
                fontSize: 12,
                fontWeight: 750,
              }}
            >
              Optional for multi-day plans.
            </span>
          ) : null}
        </>
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
      title="Booked via / Provider / Notes"
      subtitle="Add the provider, booking source and notes."
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

  const renderBudget = (
    <Card title="Costs" subtitle="Plan or track item costs.">
      {budgetDrafts.length === 0 ? (
        <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
          <div style={sectionIntroStyle}>No costs added yet.</div>
          <button
            type="button"
            onClick={addBudgetDraft}
            className="fw-pill fw-pill--meta fw-pill--action"
            style={{ height: 32, cursor: "pointer" }}
          >
            + Add cost
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 7 }}>
          {budgetDrafts.map((draft, index) => (
            <div
              key={draft.localId}
              style={{
                display: "grid",
                gap: 5,
                padding: "8px 9px",
                borderRadius: 12,
                border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                background: "color-mix(in srgb, var(--card) 86%, var(--bg))",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.35fr) minmax(86px, 0.85fr) minmax(82px, 0.55fr)",
                  gap: 7,
                  alignItems: "end",
                }}
              >
                <label style={{ ...labelStyle, gap: 4, fontSize: 11 }}>
                  Label
                  <input
                    autoFocus={expandedBudgetCostId === draft.localId}
                    value={draft.label}
                    onChange={(event) =>
                      updateBudgetDraft(draft.localId, { label: event.target.value })
                    }
                    placeholder={costLabelPlaceholderForItemType(type)}
                    style={{ ...fieldStyle, minHeight: 36, padding: "7px 9px" }}
                  />
                </label>
                <label style={{ ...labelStyle, gap: 4, fontSize: 11 }}>
                  Amount
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.amount}
                    onChange={(event) =>
                      updateBudgetDraft(draft.localId, { amount: event.target.value })
                    }
                    placeholder={index === 0 ? "120" : undefined}
                    style={{ ...fieldStyle, minHeight: 36, padding: "7px 9px" }}
                  />
                </label>
                <label style={{ ...labelStyle, gap: 4, fontSize: 11 }}>
                  Currency
                  <select
                    value={draft.currency}
                    onChange={(event) =>
                      updateBudgetDraft(draft.localId, { currency: event.target.value })
                    }
                    style={{ ...fieldStyle, minHeight: 36, padding: "7px 8px" }}
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                <span className="fw-pill fw-pill--meta">
                  {costModeText(draft.costMode)}
                </span>
                <span className="fw-pill fw-pill--meta">
                  {budgetPaymentText(draft)}
                </span>
                {budgetParticipantText(draft) ? (
                  <span className="fw-pill fw-pill--meta">
                    {budgetParticipantText(draft)}
                  </span>
                ) : null}
                {draftNeedsExchangeRate(draft) ? (
                  <span className="fw-pill fw-pill--meta">
                    exchange rate needed
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => editBudgetDraft(draft.localId)}
                  className="fw-pill fw-pill--meta fw-pill--action"
                  style={{ height: 28, cursor: "pointer" }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteBudgetDraft(draft.localId)}
                  className="fw-pill fw-pill--meta"
                  style={{ height: 28, cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {budgetDrafts.length > 0 ? (
        <button
          type="button"
          onClick={addBudgetDraft}
          className="fw-pill fw-pill--meta fw-pill--action"
          style={{ height: 32, width: "fit-content", cursor: "pointer" }}
        >
          + Add cost
        </button>
      ) : null}
    </Card>
  );

  const renderRelatedDocuments = (
    <Card title="Related documents" subtitle="Attach an existing trip document to this item.">
      {(trip?.documents ?? []).length === 0 ? (
        <div style={sectionIntroStyle}>
          No documents yet. Upload a booking confirmation, voucher or screenshot.
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {(trip?.documents ?? []).map((document) => {
            const selected = selectedDocumentIds.includes(document.id);
            return (
              <label
                key={document.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  minHeight: 36,
                  maxWidth: "100%",
                  padding: "0 10px",
                  borderRadius: 999,
                  border: selected
                    ? `1px solid ${theme.color}`
                    : "1px solid var(--border)",
                  background: selected ? theme.soft : "transparent",
                  color: "var(--text)",
                  fontSize: 12,
                  fontWeight: 850,
                  overflow: "hidden",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    setSelectedDocumentIds((current) =>
                      event.target.checked
                        ? [...current, document.id]
                        : current.filter((id) => id !== document.id),
                    );
                  }}
                />
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {document.title || document.fileName}
                </span>
              </label>
            );
          })}
        </div>
      )}
      <div style={{ display: "grid", gap: 7 }}>
        <input
          ref={documentInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            setDocumentUploadFile(event.target.files?.[0] ?? null);
            setDocumentUploadState("idle");
            setDocumentUploadMessage("");
          }}
          style={{
            ...fieldStyle,
            minHeight: 38,
            fontSize: 12,
            padding: "7px 10px",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={uploadRelatedDocument}
            disabled={!documentUploadFile || documentUploadState === "uploading"}
            style={{
              ...secondaryButtonStyle,
              minHeight: 36,
              cursor:
                !documentUploadFile || documentUploadState === "uploading"
                  ? "default"
                  : "pointer",
              opacity: !documentUploadFile || documentUploadState === "uploading" ? 0.65 : 1,
            }}
          >
            {documentUploadState === "uploading" ? "Uploading..." : "Upload document"}
          </button>
          {documentUploadMessage ? (
            <span
              style={{
                color: documentUploadState === "failed" ? "var(--danger)" : "var(--sub)",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {documentUploadMessage}
            </span>
          ) : null}
        </div>
        {visibility === "SELECTED" ? (
          <div style={sectionIntroStyle}>
            Selected-item document visibility uses shared trip document visibility.
          </div>
        ) : null}
      </div>
    </Card>
  );

  const renderVisibility = (
    <Card title="Visibility" subtitle="Choose who can see this item.">
      <div style={{ display: "grid", gap: 8 }}>
        {availableVisibilityOptions.map((option) => {
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

  const renderPlanningHero = (
    <section
      style={{
        display: "grid",
        gap: 9,
        padding: 12,
        borderRadius: 18,
        border: `1px solid color-mix(in srgb, ${theme.color} 42%, var(--border))`,
        background: `linear-gradient(135deg, ${theme.soft}, transparent 72%), var(--card)`,
        boxShadow: "0 8px 22px rgba(0,0,0,0.07)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: 15,
            background: theme.soft,
            color: theme.color,
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
          }}
        >
          <HeroIcon size={23} strokeWidth={2.25} />
        </div>
        <div style={{ display: "grid", gap: isGolfRound && selectedCourse ? 5 : 3, minWidth: 0 }}>
          {isGolfRound && !selectedCourse ? (
            <>
              <div
                style={{
                  color: "var(--text)",
                  fontSize: 20,
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
                  fontSize: 20,
                  lineHeight: 1.08,
                  fontWeight: 950,
                  overflowWrap: "anywhere",
                }}
              >
                {summaryTitle}
              </div>
              {itemSubtitle(type) ? (
                <div style={{ color: "var(--sub)", fontSize: 13, fontWeight: 850 }}>
                  {itemSubtitle(type)}
                </div>
              ) : null}
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
        "--item-accent": theme.color,
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        boxSizing: "border-box",
        overflowX: "hidden",
        padding: "10px 14px calc(88px + env(safe-area-inset-bottom, 0px))",
        display: "grid",
        gap: 10,
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--card) 92%, transparent), transparent 180px)",
      } as CSSProperties & { "--item-accent": string }}
    >
      <div style={{ display: "grid", gap: 6 }}>
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
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ color: theme.color, fontSize: 12, fontWeight: 950 }}>
            {step === 1 ? "Plan your round" : "Travel & costs"}
          </div>
          <div style={{ fontSize: 23, lineHeight: 1.05, fontWeight: 950 }}>
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

      <form onSubmit={submit} style={{ display: "grid", gap: 9 }}>
        {step === 1 ? (
          <>
            <SectionHeader title="Item Type" />
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
            {renderBudget}
            {renderRelatedDocuments}
            {renderVisibility}
            {renderDetails}

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

      {budgetModalOpen ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-item-costs-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483000,
            isolation: "isolate",
            background: "rgba(0,0,0,0.68)",
            display: "grid",
            placeItems: "end center",
            padding: "16px 12px max(24px, calc(16px + env(safe-area-inset-bottom, 0px)))",
            boxSizing: "border-box",
          }}
          onClick={() => {
            setBudgetModalOpen(false);
            setExpandedBudgetCostId(null);
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 640,
              maxHeight: "calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
              overflowY: "auto",
              margin: "0 auto",
              display: "grid",
              gap: 12,
              padding: 16,
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--card, #ffffff)",
              backgroundColor: "var(--card, #ffffff)",
              color: "var(--text)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.48)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                <div id="add-item-costs-title" style={{ fontSize: 18, fontWeight: 950 }}>
                  Costs
                </div>
                <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.4 }}>
                  {summaryTitle}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBudgetModalOpen(false);
                  setExpandedBudgetCostId(null);
                }}
                className="fw-pill fw-pill--meta"
                style={{ height: 30, cursor: "pointer" }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {budgetDrafts.map((draft, index) => {
                const paidByRequired = draft.paymentMode === "PAID_BY_ONE";
                const isExpanded = expandedBudgetCostId === draft.localId;
                const needsExchangeRate = draftNeedsExchangeRate(draft);
                return (
                  <section
                    key={draft.localId}
                    style={{
                      display: "grid",
                      gap: 9,
                      padding: 11,
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "color-mix(in srgb, var(--bg) 58%, var(--card))",
                    }}
                  >
                    <div style={{ display: "grid", gap: 7 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0, display: "grid", gap: 3 }}>
                          <div
                            style={{
                              color: "var(--text)",
                              fontSize: 13,
                              fontWeight: 950,
                              lineHeight: 1.25,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {draft.label.trim() || `Cost ${index + 1}`}
                          </div>
                          <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
                            {budgetAmountText(draft)}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedBudgetCostId(isExpanded ? null : draft.localId)
                            }
                            className="fw-pill fw-pill--meta fw-pill--action"
                            style={{ height: 28, cursor: "pointer" }}
                          >
                            {isExpanded ? "Close" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBudgetDraft(draft.localId)}
                            className="fw-pill fw-pill--meta"
                            style={{ height: 28, cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        <span className="fw-pill fw-pill--meta">
                          {costModeText(draft.costMode)}
                        </span>
                        <span className="fw-pill fw-pill--meta">
                          {budgetPaymentText(draft)}
                        </span>
                        {budgetParticipantText(draft) ? (
                          <span className="fw-pill fw-pill--meta">
                            {budgetParticipantText(draft)}
                          </span>
                        ) : null}
                        {needsExchangeRate ? (
                          <span className="fw-pill fw-pill--meta">
                            exchange rate needed
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div style={{ display: "grid", gap: 9 }}>
                        <label style={labelStyle}>
                          Label
                          <input
                            value={draft.label}
                            onChange={(event) =>
                              updateBudgetDraft(draft.localId, { label: event.target.value })
                            }
                            placeholder={costLabelPlaceholderForItemType(type)}
                            style={fieldStyle}
                          />
                        </label>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) minmax(92px, 120px)",
                            gap: 8,
                          }}
                        >
                          <label style={labelStyle}>
                            Amount
                            <input
                              type="number"
                              inputMode="decimal"
                              value={draft.amount}
                              onChange={(event) =>
                                updateBudgetDraft(draft.localId, { amount: event.target.value })
                              }
                              style={fieldStyle}
                            />
                          </label>
                          <label style={labelStyle}>
                            Currency
                            <select
                              value={draft.currency}
                              onChange={(event) =>
                                updateBudgetDraft(draft.localId, { currency: event.target.value })
                              }
                              style={fieldStyle}
                            >
                              {currencyOptions.map((currency) => (
                                <option key={currency} value={currency}>
                                  {currency}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {[
                            { value: "PER_PERSON" as CostMode, label: "Per person" },
                            { value: "TOTAL" as CostMode, label: "Total" },
                          ].map((option) => {
                            const selected = draft.costMode === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  updateBudgetDraft(draft.localId, { costMode: option.value })
                                }
                                className="fw-pill fw-pill--meta"
                                style={{
                                  height: 32,
                                  cursor: "pointer",
                                  borderColor: selected ? theme.color : "var(--border)",
                                  background: selected ? theme.soft : "transparent",
                                  color: selected ? "var(--text)" : "var(--sub)",
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {[
                            { value: "PAID_BY_ONE" as PaymentMode, label: "One member paid" },
                            { value: "EACH_PAYS_OWN" as PaymentMode, label: "Everyone pays own part" },
                          ].map((option) => {
                            const selected = draft.paymentMode === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  updateBudgetDraft(draft.localId, { paymentMode: option.value })
                                }
                                className="fw-pill fw-pill--meta"
                                style={{
                                  height: 32,
                                  cursor: "pointer",
                                  borderColor: selected ? theme.color : "var(--border)",
                                  background: selected ? theme.soft : "transparent",
                                  color: selected ? "var(--text)" : "var(--sub)",
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>

                        {paidByRequired ? (
                          <label style={labelStyle}>
                            Paid by
                            <select
                              value={draft.paidByMemberId}
                              onChange={(event) =>
                                updateBudgetDraft(draft.localId, {
                                  paidByMemberId: event.target.value,
                                })
                              }
                              style={fieldStyle}
                            >
                              <option value="">Choose member</option>
                              {(trip?.members ?? []).map((member) => (
                                <option key={member.id} value={member.id}>
                                  {memberDisplayName(member)}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}

                        <div style={{ display: "grid", gap: 7 }}>
                          <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
                            Shared with
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            {(trip?.members ?? []).map((member) => {
                              const selected = draft.participantMemberIds.includes(member.id);
                              return (
                                <label
                                  key={member.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    minHeight: 32,
                                    padding: "0 10px",
                                    borderRadius: 999,
                                    border: selected
                                      ? `1px solid ${theme.color}`
                                      : "1px solid var(--border)",
                                    background: selected ? theme.soft : "transparent",
                                    color: "var(--text)",
                                    fontSize: 12,
                                    fontWeight: 850,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(event) =>
                                      updateBudgetDraft(draft.localId, {
                                        participantMemberIds: event.target.checked
                                          ? [...draft.participantMemberIds, member.id]
                                          : draft.participantMemberIds.filter(
                                              (id) => id !== member.id,
                                            ),
                                      })
                                    }
                                  />
                                  {memberDisplayName(member)}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
              {budgetDrafts.length === 0 ? (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "color-mix(in srgb, var(--bg) 58%, var(--card))",
                    color: "var(--sub)",
                    fontSize: 12,
                    lineHeight: 1.35,
                  }}
                >
                  No costs added yet.
                </div>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 7 }}>
              <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                Use Add cost for separate costs like{" "}
                {costLabelExamplesForItemType(type).join(", ")}.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  onClick={addBudgetDraft}
                  className="fw-pill fw-pill--meta fw-pill--action"
                  style={{ height: 32, cursor: "pointer" }}
                >
                  Add cost
                </button>
                <button
                  type="button"
                  onClick={saveBudgetDrafts}
                  style={{
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "var(--text)",
                    color: "var(--bg)",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontSize: 12,
                  }}
                >
                  Save costs
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
