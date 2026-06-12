import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import L from "leaflet";
import {
  CalendarDays,
  CirclePlus,
  CheckSquare,
  ChevronRight,
  ChevronDown,
  FileText,
  Link2,
  MapPinned,
  PenLine,
  Route,
  UserRoundPlus,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { API_BASE } from "../api/base";
import { friendlyApiErrorMessage } from "../api/client";
import {
  getMyTripCosts,
  getOrganizerTripCosts,
  type MyTripCostsResponse,
  type OrganizerTripCostsResponse,
  type TripCostCategory,
  type TripCostMember,
  type MyTripCostRow,
  type TripCostRow,
} from "../api/tripCosts";
import { useAuth } from "../auth/AuthContext";
import { fileUrl } from "../api/fileUrl";
import { TripCardsSkeleton } from "../components/PolishStates";

type TripItem = {
  id: string;
  type?: string | null;
  title?: string | null;
  notes?: string | null;
  date?: string | null;
  endDate?: string | null;
  startsAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  departureFromHotelTime?: string | null;
  roundDurationMinutes?: number | null;
  returnToHotel?: string | null;
  provider?: string | null;
  bookingRef?: string | null;
  amount?: number | null;
  baseAmount?: number | null;
  exchangeRate?: number | null;
  greenFee?: number | null;
  includeGreenFeeInSplit?: boolean | null;
  includeCaddyFeeInSplit?: boolean | null;
  includeCartFeeInSplit?: boolean | null;
  directPrice?: number | null;
  caddyFee?: number | null;
  cartFee?: number | null;
  providerPrice?: number | null;
  currency?: string | null;
  locationName?: string | null;
  address?: string | null;
  paidByMemberId?: string | null;
  paidByMember?: TripMember | null;
  expenseType?: ExpenseType | null;
  costMode?: CostMode | null;
  lat?: number | string | null;
  lon?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  courseId?: string | null;
  createdByUserId?: string | null;
  visibility?: TripItemVisibility | null;
  participants?: TripItemParticipant[];
  costs?: TripItemCost[];
  visibilityMembers?: TripItemVisibilityMember[];
  documentLinks?: TripItemDocumentLink[];
  course?: {
    id: string;
    name?: string | null;
    website?: string | null;
    lat?: number | string | null;
    lon?: number | string | null;
  } | null;
};

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
  description?: string | null;
  createdById?: string | null;
  createdByUserId?: string | null;
  baseCurrency?: string | null;
  coverImageUrl?: string | null;
  members?: TripMember[];
  items?: TripItem[];
  documents?: TripDocument[];
};

type TripRole = "OWNER" | "ADMIN" | "MEMBER";

type TripItemVisibility = "GROUP" | "SELECTED" | "PRIVATE";
type ExpenseType = "PERSONAL" | "SHARED";
type CostMode = "PER_PERSON" | "TOTAL";

type TripMember = {
  id: string;
  userId?: string | null;
  displayName?: string | null;
  isGuest?: boolean;
  role: TripRole;
  user?: {
    id: string;
    handle?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
};

type TripItemParticipant = {
  id: string;
  tripMemberId: string;
  tripMember?: TripMember | null;
};

type PaymentMode = "PAID_BY_ONE" | "EACH_PAYS_OWN";

type TripItemCostParticipant = {
  id?: string;
  costId?: string;
  tripMemberId: string;
  tripMember?: TripMember | null;
};

type TripItemCost = {
  id: string;
  label?: string | null;
  amount?: number | null;
  currency?: string | null;
  exchangeRate?: number | null;
  baseAmount?: number | null;
  costMode?: CostMode | null;
  paymentMode?: PaymentMode | null;
  paidByMemberId?: string | null;
  paidByMember?: TripMember | null;
  participants?: TripItemCostParticipant[];
};

type TripItemVisibilityMember = {
  id: string;
  tripMemberId: string;
  tripMember?: TripMember | null;
};

type TripItemDocumentLink = {
  id?: string;
  tripDocumentId?: string;
  tripItemId?: string;
  tripDocument?: TripDocument | null;
};

type UserSearchResult = {
  id: string;
  handle?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
};

type TripEditDraft = {
  title: string;
  destination: string;
  description: string;
};

type EditDraft = {
  type: string;
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  provider: string;
  notes: string;
  locationName: string;
  address: string;
  bookingRef: string;
  visibility: TripItemVisibility;
  visibleToMemberIds: string[];
  documentIds: string[];
};

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

type TripView =
  | "overview"
  | "timeline"
  | "calendar"
  | "documents"
  | "map"
  | "budget";

type TripMapMarker = {
  id: string;
  number: number;
  title: string;
  typeLabel: string;
  typeKey: string;
  dateLabel: string;
  startTime: string;
  timeLabel: string;
  courseId?: string | null;
  courseName?: string | null;
  locationName?: string | null;
  address?: string | null;
  lat: number;
  lon: number;
};

type TripSummaryStat = {
  label: string;
  value: number;
};

type BudgetCategory = "Golf" | "Hotel" | "Transfer" | "Restaurant" | "Activity" | "Other";
type CostSummaryCategory =
  | "Golf"
  | "Hotel"
  | "Flight"
  | "Transport"
  | "Car Rental"
  | "Restaurant"
  | "Activity";

type CostSummaryDrilldown = {
  mode: "member" | "group";
  category: CostSummaryCategory;
};

type CostSummaryDetailRow = {
  id: string;
  sortKey: string;
  dateLabel: string;
  title: string;
  costLabel: string;
  amount: number;
  amountText: string;
  missingExchangeRate: boolean;
  meta: string[];
};

type BudgetSummary = {
  mixedCurrencies: boolean;
  currency: string;
  currencies: string[];
  total: number;
  sharedTotal: number;
  personalTotal: number;
  perPerson: number;
  greenTotal: number;
  directTotal: number;
  providerTotal: number;
  caddyTotal: number;
  cartTotal: number;
  categories: Record<BudgetCategory, number>;
};

type SettlementMember = {
  member: TripMember;
  paid: number;
  share: number;
  balance: number;
};

type SettlementTransfer = {
  from: TripMember;
  to: TripMember;
  amount: number;
};

type SettlementCurrencySummary = {
  currency: string;
  rows: SettlementMember[];
  totalOwes: number;
  totalGetsBack: number;
};

type SettlementSummary = {
  mixedCurrencies: boolean;
  currency: string;
  rows: SettlementMember[];
  currencySummaries: SettlementCurrencySummary[];
  transfers: SettlementTransfer[];
  totalPaid: number;
  totalShare: number;
  totalOwes: number;
  totalGetsBack: number;
};

type TripInvite = {
  id: string;
  token: string;
  tripId: string;
  createdAt?: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
};

type TripDocumentCategory =
  | "FLIGHT"
  | "HOTEL"
  | "GOLF"
  | "TRANSFER"
  | "VISA"
  | "GENERAL";

type TripDocumentVisibility = "SHARED" | "PRIVATE";

type TripDocument = {
  id: string;
  tripId: string;
  title: string;
  note?: string | null;
  category: TripDocumentCategory;
  visibility: TripDocumentVisibility;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: {
    id: string;
    handle?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
  itemLinks?: { tripItemId: string }[];
};

type TripDocumentDraft = {
  title: string;
  note: string;
  category: TripDocumentCategory;
  visibility: TripDocumentVisibility;
  file: File | null;
};

type TripActivityType =
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DELETED"
  | "ITEM_CREATED"
  | "ITEM_UPDATED"
  | "ITEM_DELETED"
  | "MEMBER_ADDED"
  | "INVITE_CREATED"
  | "TRIP_UPDATED";

type TripActivity = {
  id: string;
  tripId: string;
  actorUserId?: string | null;
  actorName?: string | null;
  type: TripActivityType;
  message: string;
  metadata?: unknown;
  createdAt: string;
  actorUser?: {
    id: string;
    handle?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
};

type TimelineDetail = {
  label: string;
  value: string;
};

type TripItemMapAction = {
  label: string;
  href: string;
};

type CalendarIndicator =
  | "Golf"
  | "Hotel"
  | "Transfer"
  | "Car rental"
  | "Flight"
  | "Restaurant"
  | "Other";

type CalendarSection = "Golf" | "Hotel" | "Transfers / Car" | "Flights" | "Restaurant" | "Other";

type CalendarDay = {
  key: string;
  label: string;
  weekday: string;
  items: TripItem[];
  indicators: Record<CalendarIndicator, number>;
};

type TravelChecklistItem = {
  id: string;
  label: string;
};

const memberAvatarSize = 28;

const satelliteTileUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const satelliteLabelsUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const satelliteTileAttribution =
  "&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const itemTypeOptions = [
  { value: "golf_round", label: "Golf round" },
  { value: "hotel", label: "Hotel" },
  { value: "transfer", label: "Transfer" },
  { value: "car_rental", label: "Car rental" },
  { value: "flight", label: "Flight" },
  { value: "restaurant", label: "Restaurant" },
  { value: "free_day", label: "Free day" },
  { value: "note", label: "Note" },
];

const tripItemVisibilityOptions: {
  value: TripItemVisibility;
  label: string;
}[] = [
  { value: "GROUP", label: "Group" },
  { value: "SELECTED", label: "Selected members" },
  { value: "PRIVATE", label: "Private" },
];

const memberTripItemVisibilityOptions: {
  value: TripItemVisibility;
  label: string;
}[] = [
  { value: "PRIVATE", label: "Private" },
  { value: "SELECTED", label: "Selected members" },
];

const memberRoleOptions: TripRole[] = ["MEMBER", "ADMIN", "OWNER"];

const tripDocumentCategories: TripDocumentCategory[] = [
  "FLIGHT",
  "HOTEL",
  "GOLF",
  "TRANSFER",
  "VISA",
  "GENERAL",
];

const tripDocumentCategoryLabels: Record<TripDocumentCategory, string> = {
  FLIGHT: "Flight",
  HOTEL: "Hotel",
  GOLF: "Golf",
  TRANSFER: "Transfer",
  VISA: "Visa",
  GENERAL: "General",
};

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

const editFieldStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  padding: "9px 10px",
  font: "inherit",
};

const safeSectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const wrappingActionRowStyle: React.CSSProperties = {
  ...safeSectionStyle,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  justifyContent: "flex-start",
  minWidth: 0,
};

const overviewAnchorStyle: React.CSSProperties = {
  scrollMarginTop: 18,
};

const sectionCardStyle: React.CSSProperties = {
  ...safeSectionStyle,
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: 20,
  background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
  border: "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
  boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
};

const financeSectionCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, var(--atmosphere-finance-soft), transparent 72%), color-mix(in srgb, var(--card) 94%, var(--bg))",
  border: "1px solid color-mix(in srgb, var(--atmosphere-finance) 22%, var(--border))",
};

const documentSectionCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, var(--atmosphere-document-soft), transparent 72%), color-mix(in srgb, var(--card) 94%, var(--bg))",
  border: "1px solid color-mix(in srgb, var(--atmosphere-document) 22%, var(--border))",
};

const socialSectionCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, var(--atmosphere-social-soft), transparent 72%), color-mix(in srgb, var(--card) 94%, var(--bg))",
  border: "1px solid color-mix(in srgb, var(--atmosphere-social) 22%, var(--border))",
};

const sectionInnerCardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid color-mix(in srgb, var(--border) 76%, transparent)",
  background: "color-mix(in srgb, var(--card) 88%, var(--bg))",
};

const sectionMutedCardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
  background: "color-mix(in srgb, var(--card) 92%, var(--bg))",
};

const sectionTitleTextStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: 15,
  lineHeight: 1.18,
  fontWeight: 950,
};

const sectionSubtitleTextStyle: React.CSSProperties = {
  color: "var(--sub)",
  fontSize: 12,
  lineHeight: 1.35,
  fontWeight: 750,
};

const compactLabelTextStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: 13,
  lineHeight: 1.28,
  fontWeight: 900,
};

const compactMetaTextStyle: React.CSSProperties = {
  color: "var(--sub)",
  fontSize: 11,
  lineHeight: 1.25,
  fontWeight: 800,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  borderColor: "var(--border)",
  color: "var(--text)",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "var(--accent-strong)",
  borderColor: "var(--accent-strong)",
  color: "#fff",
};

const dangerButtonStyle: React.CSSProperties = {
  background: "transparent",
  borderColor: "color-mix(in srgb, #dc2626 70%, var(--border))",
  color: "#dc2626",
};

const subviewOrder: Exclude<TripView, "overview">[] = [
  "timeline",
  "calendar",
  "documents",
  "map",
  "budget",
];

const defaultTravelChecklistItems: TravelChecklistItem[] = [
  { id: "passport-id", label: "Passport / ID" },
  { id: "flight-documents", label: "Flight documents" },
  { id: "hotel-booking", label: "Hotel booking" },
  { id: "tee-times-confirmed", label: "Tee times confirmed" },
  { id: "golf-equipment", label: "Golf equipment" },
  { id: "travel-insurance", label: "Travel insurance" },
];

const defaultTeeTimeChecklistItems: TravelChecklistItem[] = [
  { id: "confirm-tee-time", label: "Confirm tee time" },
  { id: "booking-proof", label: "Bring voucher / booking proof" },
  { id: "dress-code", label: "Check dress code" },
  { id: "transport", label: "Arrange transport" },
  { id: "golf-equipment", label: "Prepare golf equipment" },
];

function tripCacheKey(tripId: string) {
  return `fairwayd.trip.${tripId}`;
}

function travelChecklistCacheKey(tripId: string) {
  return `fairwayd.trip.${tripId}.travelChecklist`;
}

function readTravelChecklist(tripId: string) {
  try {
    const raw = window.localStorage.getItem(travelChecklistCacheKey(tripId));
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id): id is string => typeof id === "string"));
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "checkedIds" in parsed &&
      Array.isArray((parsed as { checkedIds?: unknown }).checkedIds)
    ) {
      return new Set(
        (parsed as { checkedIds: unknown[] }).checkedIds.filter(
          (id): id is string => typeof id === "string",
        ),
      );
    }
  } catch {
    return new Set<string>();
  }

  return new Set<string>();
}

function writeTravelChecklist(tripId: string, checkedIds: Set<string>) {
  try {
    window.localStorage.setItem(
      travelChecklistCacheKey(tripId),
      JSON.stringify({ checkedIds: Array.from(checkedIds) }),
    );
  } catch {
    // Checklist persistence is local-only; failures should not block the page.
  }
}

function teeTimeChecklistCacheKey(tripId: string) {
  return `fairwayd.trip.${tripId}.teeTimeChecklist`;
}

function readTeeTimeChecklist(tripId: string) {
  try {
    const raw = window.localStorage.getItem(teeTimeChecklistCacheKey(tripId));
    if (!raw) return new Map<string, Set<string>>();

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return new Map<string, Set<string>>();
    }

    const next = new Map<string, Set<string>>();
    const validChecklistIds = new Set(
      defaultTeeTimeChecklistItems.map((item) => item.id),
    );
    for (const [itemId, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        next.set(
          itemId,
          new Set(
            value.filter(
              (id): id is string =>
                typeof id === "string" && validChecklistIds.has(id),
            ),
          ),
        );
      }
    }

    return next;
  } catch {
    return new Map<string, Set<string>>();
  }
}

function writeTeeTimeChecklist(
  tripId: string,
  checkedByItemId: Map<string, Set<string>>,
) {
  try {
    const payload: Record<string, string[]> = {};
    checkedByItemId.forEach((checkedIds, itemId) => {
      payload[itemId] = Array.from(checkedIds);
    });

    window.localStorage.setItem(
      teeTimeChecklistCacheKey(tripId),
      JSON.stringify(payload),
    );
  } catch {
    // Tee-time checklist persistence is local-only.
  }
}

function formatCachedAt(value?: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function readCachedTrip(tripId: string): { trip: Trip; cachedAt: string | null } | null {
  try {
    const raw = window.localStorage.getItem(tripCacheKey(tripId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "data" in parsed &&
      (parsed as { data?: unknown }).data &&
      typeof (parsed as { data?: { id?: unknown } }).data?.id === "string"
    ) {
      const cached = parsed as { data: Trip; cachedAt?: unknown };

      return {
        trip: cached.data,
        cachedAt: typeof cached.cachedAt === "string" ? cached.cachedAt : null,
      };
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "id" in parsed &&
      typeof (parsed as { id?: unknown }).id === "string"
    ) {
      return { trip: parsed as Trip, cachedAt: null };
    }
  } catch {
    return null;
  }

  return null;
}

function writeCachedTrip(tripId: string, trip: Trip) {
  const cachedAt = new Date().toISOString();

  try {
    window.localStorage.setItem(
      tripCacheKey(tripId),
      JSON.stringify({ cachedAt, data: trip }),
    );
  } catch {
    // Cache failures should not block the live trip view.
  }

  return cachedAt;
}

function tripViewLabel(view: TripView) {
  if (view === "timeline") return "Timeline";
  if (view === "calendar") return "Calendar";
  if (view === "documents") return "Documents";
  if (view === "map") return "Map";
  if (view === "budget") return "Budget";
  return "Trip";
}

function tripViewSubtitle(view: TripView) {
  if (view === "timeline") return "Itinerary";
  if (view === "calendar") return "Day-by-day plan";
  if (view === "documents") return "Notes and files";
  if (view === "map") return "Stops and route";
  if (view === "budget") return "Shared cost view";
  return "";
}

type OverviewNavigationRowProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
};

function OverviewNavigationRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: OverviewNavigationRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        minHeight: 66,
        padding: "12px 12px 12px 14px",
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--text)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
        textAlign: "left",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          borderRadius: 14,
          background: "var(--accent-soft)",
          border: "1px solid var(--border)",
          color: "var(--accent-strong)",
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div style={{ minWidth: 0, flex: "1 1 auto", display: "grid", gap: 2 }}>
        <div
          style={{
            minWidth: 0,
            color: "var(--text)",
            fontSize: 14,
            fontWeight: 950,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            minWidth: 0,
            color: "var(--sub)",
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </div>
      </div>
      <ChevronRight
        aria-hidden="true"
        size={16}
        strokeWidth={2.5}
        style={{ color: "var(--sub)", flex: "0 0 auto" }}
      />
    </button>
  );
}

function shouldIgnoreTripSwipe(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      'input, textarea, select, button, a, [data-trip-swipe-ignore="true"], .leaflet-container',
    ),
  );
}

function itemIcon(type?: string | null) {
  const value = String(type ?? "").toLowerCase();

  if (value === "flight" || value === "flights") return "âœˆï¸";
  if (value === "golf_round" || value === "course") return "â›³";
  if (value === "hotel") return "ðŸ¨";
  if (value === "transfer" || value === "transport") return "ðŸš—";
  if (value === "car_rental") return "ðŸš™";
  if (value === "restaurant") return "ðŸ½";
  if (value === "free_day") return "ðŸŒ´";
  return "ðŸ“";
}

function itemDateValue(item: TripItem) {
  return item.date ?? item.startsAt ?? null;
}

function itemTypeLabel(type?: string | null) {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer" || value === "transport") return "Transfer";
  if (value === "car_rental") return "Car rental";
  if (value === "flight" || value === "flights") return "Flight";
  if (value === "restaurant") return "Restaurant";
  if (value === "free_day") return "Activity";
  return "Other";
}

function calendarIndicator(type?: string | null): CalendarIndicator {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer" || value === "transport") return "Transfer";
  if (value === "car_rental") return "Car rental";
  if (value === "flight" || value === "flights") return "Flight";
  if (value === "restaurant") return "Restaurant";
  return "Other";
}

function calendarSection(type?: string | null): CalendarSection {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer" || value === "transport" || value === "car_rental") {
    return "Transfers / Car";
  }
  if (value === "flight" || value === "flights") return "Flights";
  if (value === "restaurant") return "Restaurant";
  return "Other";
}

function calendarItemAccent(item: TripItem) {
  const value = String(item.type ?? "").toLowerCase();

  if (value === "flight" || value === "flights") {
    return {
      border: "color-mix(in srgb, #2f91d8 72%, var(--border))",
      header: "#2f91d8",
      rail: "color-mix(in srgb, #2f91d8 94%, var(--border))",
      headerText: "#fff",
      headerSubText: "rgba(255,255,255,0.78)",
      pill: "Flight",
    };
  }

  if (value === "hotel" || value === "stay" || value === "accommodation") {
    return {
      border: "color-mix(in srgb, #c95f4f 74%, var(--border))",
      header: "#c95f4f",
      rail: "color-mix(in srgb, #c95f4f 94%, var(--border))",
      headerText: "#fff",
      headerSubText: "rgba(255,255,255,0.78)",
      pill: "Hotel",
    };
  }

  if (value === "golf_round" || value === "course") {
    return {
      border: "color-mix(in srgb, var(--accent) 74%, var(--border))",
      header: "var(--accent)",
      rail: "color-mix(in srgb, var(--accent) 96%, var(--border))",
      headerText: "#fff",
      headerSubText: "rgba(255,255,255,0.78)",
      pill: "Golf",
    };
  }

  if (value === "transfer" || value === "transport") {
    return {
      border: "color-mix(in srgb, #b86f16 74%, var(--border))",
      header: "#b86f16",
      rail: "color-mix(in srgb, #b86f16 96%, var(--border))",
      headerText: "#fff",
      headerSubText: "rgba(255,255,255,0.78)",
      pill: "Transfer",
    };
  }

  if (value === "car_rental") {
    return {
      border: "color-mix(in srgb, #2f6fb9 74%, var(--border))",
      header: "#2f6fb9",
      rail: "color-mix(in srgb, #2f6fb9 96%, var(--border))",
      headerText: "#fff",
      headerSubText: "rgba(255,255,255,0.78)",
      pill: "Car rental",
    };
  }

  if (value === "restaurant") {
    return {
      border: "color-mix(in srgb, #d15f32 74%, var(--border))",
      header: "#d15f32",
      rail: "color-mix(in srgb, #d15f32 94%, var(--border))",
      headerText: "#fff",
      headerSubText: "rgba(255,255,255,0.78)",
      pill: "Restaurant",
    };
  }

  return {
    border: "color-mix(in srgb, #64748b 62%, var(--border))",
    header: "#64748b",
    rail: "color-mix(in srgb, #64748b 88%, var(--border))",
    headerText: "#fff",
    headerSubText: "rgba(255,255,255,0.78)",
    pill: "Other",
  };
}

function budgetCategory(type?: string | null): BudgetCategory {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer" || value === "transport" || value === "car_rental") {
    return "Transfer";
  }
  if (value === "restaurant") return "Restaurant";
  if (value === "free_day") return "Activity";
  return "Other";
}

function dateKey(item: TripItem) {
  const value = itemDateValue(item);
  if (!value) return "unscheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unscheduled";

  return date.toISOString().slice(0, 10);
}

function calendarItemDayKeys(item: TripItem) {
  const keys = new Set<string>();
  const dateStartKey = dayKeyFromValue(item.date);
  const startsAtKey = dayKeyFromValue(item.startsAt);
  const endKey = dayKeyFromValue(item.endDate);

  if (isCalendarSpanningItem(item) && dateStartKey && endKey) {
    for (const key of dayKeysBetween(dateStartKey, endKey)) {
      keys.add(key);
    }
  }

  if (isCalendarSpanningItem(item) && startsAtKey && endKey) {
    for (const key of dayKeysBetween(startsAtKey, endKey)) {
      keys.add(key);
    }
  }

  if (dateStartKey) keys.add(dateStartKey);
  if (startsAtKey) keys.add(startsAtKey);
  if (!dateStartKey && !startsAtKey && endKey) keys.add(endKey);

  return Array.from(keys);
}

function calendarItemMatchesDay(item: TripItem, selectedKey: string) {
  if (!selectedKey || selectedKey === "unscheduled") return false;

  const dateStartKey = dayKeyFromValue(item.date);
  const startsAtKey = dayKeyFromValue(item.startsAt);
  const endKey = dayKeyFromValue(item.endDate);
  const canSpan = isCalendarSpanningItem(item);

  return (
    dateStartKey === selectedKey ||
    startsAtKey === selectedKey ||
    (canSpan && dayKeyFallsInRange(selectedKey, dateStartKey, endKey)) ||
    (canSpan && dayKeyFallsInRange(selectedKey, startsAtKey, endKey))
  );
}

function isCalendarSpanningItem(item: TripItem) {
  const value = String(item.type ?? "").toLowerCase();
  return (
    value === "hotel" ||
    value === "stay" ||
    value === "accommodation" ||
    value === "transfer" ||
    value === "transport" ||
    value === "car_rental"
  );
}

function dayKeyFromValue(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "";

  return localDateKey(date);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayKeyFallsInRange(selectedKey: string, startKey: string, endKey: string) {
  if (!selectedKey || !startKey || !endKey) return false;

  const first = startKey <= endKey ? startKey : endKey;
  const last = startKey <= endKey ? endKey : startKey;

  return selectedKey >= first && selectedKey <= last;
}

function dayKeysBetween(startKey: string, endKey: string) {
  const keys: string[] = [];
  if (!startKey) return keys;

  const [startYear, startMonth, startDay] = startKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = (endKey || startKey).split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [startKey];
  }

  const last = end.getTime() < start.getTime() ? start : end;
  const cursor = new Date(start);

  while (cursor.getTime() <= last.getTime()) {
    keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function formatDateLabel(key: string) {
  if (key === "unscheduled") return "Unscheduled";

  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Unscheduled";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatWeekdayLabel(key: string) {
  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(date);
}

function calendarDateParts(key: string) {
  if (key === "unscheduled") {
    return { dayMonth: "No date", year: "" };
  }

  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { dayMonth: "No date", year: "" };
  }

  const parts = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  return {
    dayMonth: [day, month].filter(Boolean).join(" "),
    year,
  };
}

function eventDateBlockParts(key: string) {
  if (key === "unscheduled") {
    return { weekday: "Tee", date: "--.--" };
  }

  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { weekday: "Tee", date: "--.--" };
  }

  const weekday = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(date);
  const parts = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "--";
  const month = parts.find((part) => part.type === "month")?.value ?? "--";

  return { weekday, date: `${day}.${month}` };
}

function compactDateLabel(key: string) {
  if (key === "unscheduled") return "";

  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatItemDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDocumentDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatActivityDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function activityIcon(type: TripActivityType): LucideIcon {
  if (type === "DOCUMENT_UPLOADED" || type === "DOCUMENT_DELETED") return FileText;
  if (type === "ITEM_CREATED") return CirclePlus;
  if (type === "ITEM_UPDATED" || type === "ITEM_DELETED") return PenLine;
  if (type === "MEMBER_ADDED") return UserRoundPlus;
  if (type === "INVITE_CREATED") return Link2;
  return CheckSquare;
}
function formatTime(item: TripItem) {
  if (item.startTime) return item.startTime;
  if (!item.startsAt) return "";

  const date = new Date(item.startsAt);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTimeRange(item: TripItem) {
  const start = formatTime(item);
  const end = item.endTime?.trim() || "";

  if (isGolfItem(item)) return start || end;
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function formatDurationMinutes(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "";
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function timeToMinutes(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function expectedGolfEndTime(item: TripItem) {
  const end = item.endTime?.trim();
  if (end) return end;

  const start = timeToMinutes(formatTime(item));
  const duration = item.roundDurationMinutes;
  if (
    start == null ||
    typeof duration !== "number" ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return "";
  }

  return minutesToTime(start + duration);
}

function timeSortValue(item: TripItem) {
  return formatTime(item) || "99:99";
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

function budgetAmount(value: number, summary: BudgetSummary) {
  if (summary.mixedCurrencies) return value > 0 ? "Mixed currencies" : formatMoney(0, summary.currency);
  return formatMoney(value, summary.currency);
}

function settlementAmount(value: number, summary: SettlementSummary) {
  if (summary.mixedCurrencies) {
    if (Math.abs(value) < 0.005) return formatMoney(0, summary.currency);
    return "Mixed currencies";
  }

  return formatMoney(Math.abs(value), summary.currency);
}

function settlementCurrencyAmount(value: number, currency: string) {
  return formatMoney(Math.abs(value), currency);
}

function formatSettlementBalanceLine(
  member: TripMember,
  balance: number,
  amountText: string,
) {
  if (balance > 0.005) {
    return `${memberDisplayName(member)} gets back ${amountText}`;
  }

  if (balance < -0.005) {
    return `${memberDisplayName(member)} owes ${amountText}`;
  }

  return `${memberDisplayName(member)} is even`;
}

function settlementSummaryText(trip: Trip | null, summary: SettlementSummary) {
  const lines = [
    `${trip?.title || "Trip"} trip balances`,
    "",
  ];

  if (summary.mixedCurrencies) {
    lines.push("Mixed currencies: no automatic FX conversion applied.", "");
    lines.push("Per-currency balances:");

    for (const currencySummary of summary.currencySummaries) {
      lines.push(currencySummary.currency);
      const activeRows = currencySummary.rows.filter(
        (row) => Math.abs(row.balance) > 0.005,
      );

      if (activeRows.length === 0) {
        lines.push("- Everyone is even.");
      } else {
        for (const row of activeRows) {
          lines.push(
            `- ${formatSettlementBalanceLine(
              row.member,
              row.balance,
              settlementCurrencyAmount(row.balance, currencySummary.currency),
            )}`,
          );
        }
      }
    }

    lines.push("", "Suggested payments are disabled for mixed currencies.");
    return lines.join("\n");
  }

  lines.push("Member balances:");
  if (summary.rows.length === 0) {
    lines.push("- No member balances yet.");
  } else {
    for (const row of summary.rows) {
      lines.push(
        `- ${formatSettlementBalanceLine(
          row.member,
          row.balance,
          settlementAmount(row.balance, summary),
        )}`,
      );
    }
  }

  lines.push("", "Suggested payments:");
  if (summary.transfers.length === 0) {
    lines.push("- Everyone is even.");
  } else {
    for (const transfer of summary.transfers) {
      lines.push(
        `- ${memberDisplayName(transfer.from)} pays ${memberDisplayName(
          transfer.to,
        )} ${settlementAmount(transfer.amount, summary)}`,
      );
    }
  }

  return lines.join("\n");
}

function isGolfItem(item: TripItem) {
  const value = String(item.type ?? "").toLowerCase();
  return value === "golf_round" || value === "course";
}

function isFlightItem(item: TripItem) {
  const value = String(item.type ?? "").toLowerCase();
  return value === "flight" || value === "flights";
}

function flightTitle(flightNumber: string) {
  const value = flightNumber.trim();
  if (!value) return "Flight";
  return value.toLowerCase().startsWith("flight ") ? value : `Flight ${value}`;
}

function flightNumberText(item: TripItem) {
  return (item.title || "").replace(/^Flight\s+/i, "").trim();
}

function flightSummaryLine(item: TripItem) {
  return [flightNumberText(item), item.provider?.trim()].filter(Boolean).join(" · ");
}

function finiteAmount(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function settlementItemAmount(item: TripItem) {
  if (isFlightItem(item)) return 0;

  const golf = isGolfItem(item);
  const green =
    golf && item.includeGreenFeeInSplit !== false
      ? finiteAmount(item.greenFee ?? item.directPrice)
      : 0;
  const direct = golf
    ? item.greenFee
      ? finiteAmount(item.directPrice)
      : 0
    : finiteAmount(item.directPrice);
  const provider =
    typeof item.providerPrice === "number" && Number.isFinite(item.providerPrice)
      ? item.providerPrice
      : 0;
  const caddy =
    !golf || item.includeCaddyFeeInSplit !== false
      ? finiteAmount(item.caddyFee)
      : 0;
  const cart =
    !golf || item.includeCartFeeInSplit !== false
      ? finiteAmount(item.cartFee)
      : 0;

  return green + direct + provider + caddy + cart;
}

function itemBudgetAmount(item: TripItem) {
  if (isFlightItem(item)) return 0;
  const amount = finiteAmount(item.amount);
  if (amount > 0) return amount;
  const baseAmount = finiteAmount(item.baseAmount);
  if (baseAmount > 0) return baseAmount;
  return settlementItemAmount(item);
}

function dateInputValue(item: TripItem) {
  const value = itemDateValue(item);
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function endDateInputValue(item: TripItem) {
  if (!item.endDate) return "";

  const date = new Date(item.endDate);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatDateRange(item: TripItem) {
  const start = formatItemDate(itemDateValue(item));
  const end = formatItemDate(item.endDate);

  if (!start || !end) return "";

  const startKey = dateKey(item);
  const endDate = new Date(item.endDate as string);
  const endKey = Number.isNaN(endDate.getTime())
    ? ""
    : endDate.toISOString().slice(0, 10);

  if (!endKey || startKey === endKey) return "";
  return `${start} - ${end}`;
}

function tripDateRange(items?: TripItem[]) {
  const times =
    items
      ?.flatMap((item) => [itemDateValue(item), item.endDate])
      .map((value) => (value ? new Date(value).getTime() : Number.NaN))
      .filter((value) => Number.isFinite(value)) ?? [];

  if (times.length === 0) return "";

  const start = formatItemDate(new Date(Math.min(...times)).toISOString());
  const end = formatItemDate(new Date(Math.max(...times)).toISOString());

  if (!start || !end) return "";
  return start === end ? start : `${start} - ${end}`;
}

function tripItemTitle(item: TripItem) {
  return (
    (isGolfItem(item) && item.course?.name?.trim()) ||
    item.title?.trim() ||
    item.locationName?.trim() ||
    itemTypeLabel(item.type)
  );
}

function tripItemHeaderTitle(item: TripItem) {
  if (isFlightItem(item)) return nextUpFlightRoute(item);
  if (isTransportItem(item)) return compactItemWhereLine(item) || tripItemTitle(item);
  return tripItemTitle(item);
}

function isTransportItem(item: TripItem) {
  const value = String(item.type ?? "").toLowerCase();
  return value === "transfer" || value === "transport" || value === "car_rental";
}

function isHotelItem(item: TripItem) {
  const value = String(item.type ?? "").toLowerCase();
  return value === "hotel" || value === "stay" || value === "accommodation";
}

function isCarRentalItem(item: TripItem) {
  return String(item.type ?? "").toLowerCase() === "car_rental";
}

function isTransferType(type?: string | null) {
  const value = String(type ?? "").toLowerCase();
  return value === "transfer" || value === "transport" || value === "car_rental";
}

function isNoteItem(item: TripItem) {
  return String(item.type ?? "").toLowerCase() === "note";
}

function itemTypeSupportsCosts(type?: string | null) {
  const value = String(type ?? "").toLowerCase();
  return value !== "note";
}

function airportCodeOrName(value?: string | null) {
  const text = value?.trim() ?? "";
  if (!text) return "";

  if (/^[a-z]{3}$/i.test(text)) return text.toUpperCase();
  const code = text.match(/\b[A-Z]{3}\b/)?.[0];
  return code || text;
}

function nextUpFlightRoute(item: TripItem) {
  const origin = airportCodeOrName(item.locationName);
  const destination = airportCodeOrName(item.address);

  if (origin && destination) return `${origin} â†’ ${destination}`;
  if (origin) return `${origin} â†’ Arrival airport missing`;
  if (destination) return `Departure airport missing â†’ ${destination}`;
  return "Departure airport â†’ Arrival airport missing";
}

function nextUpFlightTiming(item: TripItem) {
  const startKey = dateKey(item);
  const endKey = item.endDate ? dayKeyFromValue(item.endDate) : "";
  const start = [compactDateLabel(startKey), formatTime(item)].filter(Boolean).join(" ");
  const end = [compactDateLabel(endKey || startKey), item.endTime?.trim()]
    .filter(Boolean)
    .join(" ");

  if (start && end) return `${start} â†’ ${end}`;
  return start || end;
}

function nextUpDateTimeLine(item: TripItem, displayKey: string) {
  const date = compactDateLabel(displayKey);
  const time = formatTimeRange(item);
  return [date, time].filter(Boolean).join(" · ");
}

function compactItemWhenLine(item: TripItem, displayKey?: string) {
  if (isGolfItem(item)) {
    return [
      compactDateLabel(displayKey || dateKey(item)),
      formatTime(item) ? `Tee ${formatTime(item)}` : "",
      item.departureFromHotelTime?.trim()
        ? `Depart ${item.departureFromHotelTime.trim()}`
        : "",
      expectedGolfEndTime(item) ? `End ${expectedGolfEndTime(item)}` : "",
      item.returnToHotel?.trim() ? item.returnToHotel.trim() : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (isFlightItem(item)) return nextUpFlightTiming(item);
  if (isHotelItem(item)) {
    const dateRange = [
      compactDateLabel(dateKey(item)),
      item.endDate ? compactDateLabel(dayKeyFromValue(item.endDate)) : "",
    ]
      .filter(Boolean)
      .join(" â†’ ");
    const checkIn = item.startTime?.trim() || "14:00";
    const checkOut = item.endTime?.trim() || "11:00";
    return [
      dateRange || compactDateLabel(displayKey || dateKey(item)),
      `Check-in ${checkIn}`,
      `Check-out ${checkOut}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return nextUpDateTimeLine(item, displayKey || dateKey(item));
}

function compactGolfTimingLine(item: TripItem, displayKey?: string) {
  return [
    compactDateLabel(displayKey || dateKey(item)),
    formatTime(item) ? `Tee ${formatTime(item)}` : "",
    item.departureFromHotelTime?.trim()
      ? `Depart ${item.departureFromHotelTime.trim()}`
      : "",
    expectedGolfEndTime(item) ? `End ${expectedGolfEndTime(item)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function compactGolfReturnLine(item: TripItem) {
  return item.returnToHotel?.trim() || "";
}

function compactItemWhereLine(item: TripItem) {
  if (isFlightItem(item)) {
    const route = nextUpFlightRoute(item);
    return route === tripItemTitle(item) ? "" : route;
  }

  if (item.locationName?.trim() && item.address?.trim()) {
    if (isCarRentalItem(item)) {
      return `Pickup ${item.locationName.trim()} · Return ${item.address.trim()}`;
    }
    return `${item.locationName.trim()} â†’ ${item.address.trim()}`;
  }

  return item.locationName?.trim() || item.address?.trim() || "";
}

function TripItemCardHeader({
  item,
  displayKey,
  onTitleClick,
}: {
  item: TripItem;
  displayKey?: string;
  onTitleClick?: () => void;
}) {
  const accent = calendarItemAccent(item);
  const dateBlock = eventDateBlockParts(displayKey || dateKey(item));
  const typeLabel = itemTypeLabel(item.type).toUpperCase();
  const title = tripItemHeaderTitle(item);
  const titleStyle: React.CSSProperties = {
    appearance: "none",
    WebkitAppearance: "none",
    border: 0,
    padding: 0,
    margin: 0,
    background: "transparent",
    color: accent.headerText,
    cursor: onTitleClick ? "pointer" : "default",
    font: "inherit",
    fontSize: 15,
    fontWeight: 950,
    lineHeight: 1.18,
    textAlign: "left",
    overflowWrap: "anywhere",
  };

  return (
    <div
      style={{
        borderBottom: `1px solid ${accent.border}`,
        background: accent.header,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "50px 1px minmax(0, 1fr)",
        alignItems: "center",
        columnGap: 11,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          display: "grid",
          gap: 3,
          justifyItems: "start",
        }}
      >
        <span
          style={{
            color: accent.headerSubText,
            fontSize: 10,
            lineHeight: 1,
            fontWeight: 950,
            textTransform: "uppercase",
          }}
        >
          {dateBlock.weekday}
        </span>
        <span
          style={{
            color: accent.headerText,
            fontSize: 15,
            lineHeight: 1,
            fontWeight: 950,
          }}
        >
          {dateBlock.date}
        </span>
      </div>
      <div
        aria-hidden="true"
        style={{
          width: 1,
          alignSelf: "stretch",
          background: "rgba(255,255,255,0.34)",
        }}
      />
      <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
            {itemIcon(item.type)}
          </span>
          <span
            style={{
              color: accent.headerSubText,
              fontSize: 11,
              lineHeight: 1.1,
              fontWeight: 950,
              textTransform: "uppercase",
            }}
          >
            {typeLabel}
          </span>
        </div>
        {onTitleClick ? (
          <button type="button" onClick={onTitleClick} style={titleStyle}>
            {title}
          </button>
        ) : (
          <div style={titleStyle}>{title}</div>
        )}
      </div>
    </div>
  );
}

function compactNoteLine(item: TripItem) {
  const text = item.notes?.trim() || "";
  if (!text) return "";
  return text.length > 88 ? `${text.slice(0, 85).trim()}...` : text;
}

function tripItemDomId(itemId: string) {
  return `trip-item-${itemId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function mapUrlForItem(item: TripItem) {
  const lat = toFiniteNumber(item.course?.lat ?? item.lat ?? item.latitude);
  const lon = toFiniteNumber(item.course?.lon ?? item.lon ?? item.longitude);

  if (
    lat != null &&
    lon != null &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
  }

  const query = [item.locationName, item.address].filter(Boolean).join(" ");
  if (!query.trim()) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function mapUrlForPlace(value?: string | null) {
  const query = value?.trim() ?? "";
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function routeUrlForPlaces(origin?: string | null, destination?: string | null) {
  const start = origin?.trim() ?? "";
  const end = destination?.trim() ?? "";
  if (!start || !end) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(end)}`;
}

function directionsUrlForPlace(destination?: string | null) {
  const end = destination?.trim() ?? "";
  if (!end) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(end)}`;
}

function tripItemMapActions(item: TripItem): TripItemMapAction[] {
  if (isFlightItem(item)) {
    return [
      mapUrlForPlace(item.locationName)
        ? { label: "Map Departure", href: mapUrlForPlace(item.locationName) as string }
        : null,
      mapUrlForPlace(item.address)
        ? { label: "Map Arrival", href: mapUrlForPlace(item.address) as string }
        : null,
    ].filter((action): action is TripItemMapAction => Boolean(action));
  }

  if (isTransportItem(item)) {
    const pickupMap = mapUrlForPlace(item.locationName);
    const routeMap = routeUrlForPlaces(item.locationName, item.address);
    const destinationDirections = directionsUrlForPlace(item.address);
    return [
      pickupMap
        ? {
            label: isCarRentalItem(item) ? "Pickup Map" : "Map Pickup",
            href: pickupMap,
          }
        : null,
      !isCarRentalItem(item) && routeMap
        ? { label: "Route", href: routeMap }
        : null,
      !isCarRentalItem(item) && !routeMap && destinationDirections
        ? { label: "Directions", href: destinationDirections }
        : null,
    ].filter((action): action is TripItemMapAction => Boolean(action));
  }

  return [
    mapUrlForItem(item) ? { label: "Map", href: mapUrlForItem(item) as string } : null,
    directionsUrlForItem(item)
      ? { label: "Directions", href: directionsUrlForItem(item) as string }
      : null,
  ].filter((action): action is TripItemMapAction => Boolean(action));
}

function directionsUrlForItem(item: TripItem) {
  const lat = toFiniteNumber(item.course?.lat ?? item.lat ?? item.latitude);
  const lon = toFiniteNumber(item.course?.lon ?? item.lon ?? item.longitude);

  if (
    lat != null &&
    lon != null &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`;
  }

  const query = [
    item.locationName,
    item.address,
    item.course?.name,
    item.title,
  ]
    .filter(Boolean)
    .join(" ");

  if (!query.trim()) return null;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

function linkedDocumentsForItem(item: TripItem, documents: TripDocument[] = []) {
  const linked = (item.documentLinks ?? [])
    .map((link) => link.tripDocument)
    .filter((document): document is TripDocument => Boolean(document));
  if (linked.length > 0) return linked;

  return documents.filter((document) =>
    (document.itemLinks ?? []).some((link) => link.tripItemId === item.id),
  );
}

function timelineDetails(item: TripItem) {
  const details: TimelineDetail[] = [];
  const isFlight = isFlightItem(item);
  const isGolf = isGolfItem(item);

  if (isGolf) {
    if (item.departureFromHotelTime?.trim()) {
      details.push({
        label: "Departure from hotel",
        value: item.departureFromHotelTime.trim(),
      });
    }

    const duration = formatDurationMinutes(item.roundDurationMinutes);
    if (duration) {
      details.push({
        label: "Duration",
        value: duration,
      });
    }

    if (item.endTime?.trim()) {
      details.push({
        label: "Expected end",
        value: item.endTime.trim(),
      });
    }

    if (item.returnToHotel?.trim()) {
      details.push({
        label: "Return to hotel",
        value: item.returnToHotel.trim(),
      });
    }
  }

  if (item.provider?.trim()) {
    details.push({
      label: isFlight ? "Airline" : "Provider",
      value: item.provider.trim(),
    });
  }

  if (item.locationName?.trim()) {
    details.push({
      label: isFlight ? "From" : "Location",
      value: item.locationName.trim(),
    });
  }

  if (item.address?.trim()) {
    details.push({
      label: isFlight ? "To" : "Address",
      value: item.address.trim(),
    });
  }

  if (item.bookingRef?.trim()) {
    details.push({ label: "Booking", value: item.bookingRef.trim() });
  }

  return details;
}

function numberInputValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

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

function errorMessageForResponse(status: number, fallback: string) {
  if (status === 403) return "Only trip admins can edit this item.";
  return fallback;
}

function tripErrorMessageForResponse(status: number, fallback: string) {
  if (status === 403) return "Only trip admins can edit this trip.";
  return fallback;
}

function memberErrorMessageForResponse(status: number, fallback: string) {
  if (status === 403) return "Only trip admins can manage members.";
  if (status === 409) return "This member is already on the trip.";
  return fallback;
}

function displayUserName(user?: UserSearchResult | null) {
  return user?.name || user?.handle || "Fairwayd user";
}

function memberDisplayName(member?: TripMember | null) {
  return (
    member?.displayName ||
    member?.user?.name ||
    member?.user?.handle ||
    "Fairwayd member"
  );
}

function tripCostMemberDisplayName(member?: TripCostMember | null) {
  return (
    member?.displayName ||
    member?.user?.name ||
    member?.user?.handle ||
    "Fairwayd member"
  );
}

function tripCostDateLabel(row: TripCostRow) {
  if (!row.date) return "";
  return formatDateLabel(row.date.slice(0, 10));
}

function tripCostDetailPlace(row: {
  locationName?: string | null;
  provider?: string | null;
  tripItemType?: string | null;
}) {
  return (
    row.locationName?.trim() ||
    row.provider?.trim() ||
    row.tripItemType?.trim() ||
    ""
  );
}

function tripCostBalanceMessage(row: MyTripCostRow, baseCurrency: string) {
  if (row.paymentMode === "EACH_PAYS_OWN") {
    return `Your part ${formatMoney(row.personalShare, baseCurrency)} - everyone pays own part`;
  }
  if (row.netBalance > 0) {
    return `Others owe you ${formatMoney(row.netBalance, baseCurrency)}`;
  }
  if (row.netBalance < 0) {
    return `You owe ${formatMoney(Math.abs(row.netBalance), baseCurrency)}`;
  }
  return "You are balanced on this cost.";
}

function aggregateTripCostMemberAmounts(
  entries: Array<{ member: TripCostMember; amount: number }>,
) {
  const rows = new Map<string, { member: TripCostMember; amount: number }>();
  for (const entry of entries) {
    const current = rows.get(entry.member.id);
    rows.set(entry.member.id, {
      member: current?.member ?? entry.member,
      amount: (current?.amount ?? 0) + entry.amount,
    });
  }
  return Array.from(rows.values())
    .map((row) => ({ ...row, amount: Math.round(row.amount * 100) / 100 }))
    .filter((row) => row.amount > 0)
    .sort((a, b) =>
      tripCostMemberDisplayName(a.member).localeCompare(
        tripCostMemberDisplayName(b.member),
      ),
    );
}

function myCostsOwedToMeBreakdown(data?: MyTripCostsResponse | null) {
  return aggregateTripCostMemberAmounts(
    (data?.costs ?? []).flatMap((row) => row.owedToMe),
  );
}

function myCostsIOweBreakdown(data?: MyTripCostsResponse | null) {
  return aggregateTripCostMemberAmounts(
    (data?.costs ?? []).flatMap((row) => row.iOwe),
  );
}

function tripCostPaymentModeText(row: Pick<TripCostRow, "paymentMode">) {
  return row.paymentMode === "EACH_PAYS_OWN"
    ? "Everyone pays own part"
    : "One member paid";
}

function organizerCostPerPersonShare(row: TripCostRow) {
  return row.participantCount > 0
    ? row.totalBaseAmount / row.participantCount
    : 0;
}

function organizerCostOwedRows(row: TripCostRow) {
  if (row.paymentMode !== "PAID_BY_ONE" || !row.paidByMemberId || !row.paidBy) {
    return [];
  }
  const share = organizerCostPerPersonShare(row);
  if (share <= 0) return [];
  return row.participants
    .filter((member) => member.id !== row.paidByMemberId)
    .map((member) => ({
      member,
      paidBy: row.paidBy as TripCostMember,
      amount: share,
    }));
}

function organizerBalanceText(balance: number, currency: string) {
  if (balance > 0) return `gets back ${formatMoney(balance, currency)}`;
  if (balance < 0) return `owes ${formatMoney(Math.abs(balance), currency)}`;
  return "balanced";
}

function effectiveParticipants(item: TripItem, members: TripMember[]) {
  if (item.expenseType === "PERSONAL") {
    const payerId = item.paidByMemberId || item.paidByMember?.id;
    const payer = payerId
      ? members.find((member) => member.id === payerId)
      : item.paidByMember;
    return payer ? [payer] : [];
  }

  if (item.participants && item.participants.length > 0) {
    return item.participants
      .map((participant) => participant.tripMember)
      .filter((member): member is TripMember => !!member);
  }

  return members;
}

function payerSummary(item: TripItem) {
  if (!item.paidByMember) return "";
  return memberDisplayName(item.paidByMember);
}

function expenseTypeLabel(item: TripItem) {
  return item.expenseType === "PERSONAL" ? "Personal" : "Shared";
}

function costModeLabel(item: TripItem) {
  return item.costMode === "PER_PERSON"
    ? "Amount per person"
    : "Total amount to split";
}

function costModeText(mode?: CostMode | null) {
  return mode === "PER_PERSON"
    ? "amount per person"
    : "total amount to split";
}

function costModeOptionLabel(mode: CostMode) {
  return mode === "PER_PERSON" ? "Amount per person" : "Total amount to split";
}

function budgetDraftSplitAmounts(draft: BudgetCostDraft) {
  const amount = optionalNumber(draft.amount);
  const participantCount = Math.max(draft.participantMemberIds.length, 0);
  if (amount === undefined || amount <= 0 || participantCount <= 0) {
    return { amount, participantCount, eachPerson: 0, totalCost: 0 };
  }
  return {
    amount,
    participantCount,
    eachPerson:
      draft.costMode === "PER_PERSON" ? amount : amount / participantCount,
    totalCost:
      draft.costMode === "PER_PERSON" ? amount * participantCount : amount,
  };
}

function budgetDraftShareHelperText(draft: BudgetCostDraft) {
  const { amount, participantCount, eachPerson, totalCost } =
    budgetDraftSplitAmounts(draft);
  if (amount === undefined || amount <= 0) {
    return draft.costMode === "PER_PERSON"
      ? "Example: CHF 120 per selected person = CHF 480 total for 4 people."
      : "Example: CHF 480 shared by 4 people = CHF 120 each.";
  }
  if (participantCount <= 0) {
    return draft.costMode === "PER_PERSON"
      ? `${formatMoney(amount, draft.currency)} per selected person`
      : `${formatMoney(amount, draft.currency)} shared by selected people`;
  }
  if (draft.costMode === "PER_PERSON") {
    return `Example: ${formatMoney(
      eachPerson,
      draft.currency,
    )} per selected person = ${formatMoney(totalCost, draft.currency)} total for ${
      participantCount
    } ${participantCount === 1 ? "person" : "people"}.`;
  }
  return `Example: ${formatMoney(amount, draft.currency)} shared by ${participantCount} ${
    participantCount === 1 ? "person" : "people"
  } = ${formatMoney(eachPerson, draft.currency)} each.`;
}

function budgetDraftPreviewText(draft: BudgetCostDraft) {
  const { amount, participantCount, eachPerson, totalCost } =
    budgetDraftSplitAmounts(draft);
  if (amount === undefined || amount <= 0 || participantCount <= 0) return null;
  return {
    eachPerson: `Each person: ${formatMoney(eachPerson, draft.currency)}`,
    totalCost: `Total cost: ${formatMoney(totalCost, draft.currency)}`,
  };
}

function budgetDraftCostModeWarning(draft: BudgetCostDraft) {
  const { amount, participantCount } = budgetDraftSplitAmounts(draft);
  if (
    draft.paymentMode === "EACH_PAYS_OWN" &&
    draft.costMode === "PER_PERSON" &&
    participantCount > 1
  ) {
    if (amount !== undefined && amount >= 300) {
      return "High per-person amount for a shared cost. Did you mean total amount?";
    }
    return "You selected Amount per person. Each selected person will be charged the full entered amount.";
  }
  return "";
}

function tripCostShareSourceText(row: MyTripCostRow, baseCurrency: string) {
  if (row.costMode === "PER_PERSON") {
    return `Your part ${formatMoney(row.personalShare, baseCurrency)} - amount per person`;
  }
  return `Your part ${formatMoney(
    row.personalShare,
    baseCurrency,
  )} - split from ${formatMoney(row.totalBaseAmount, baseCurrency)} total`;
}

function defaultCostModeForItemType(type?: string | null): CostMode {
  const value = String(type ?? "").toLowerCase();
  if (value === "golf_round" || value === "course" || value === "flight") {
    return "PER_PERSON";
  }
  return "TOTAL";
}

function defaultPaymentModeForItemType(type?: string | null): PaymentMode {
  const value = String(type ?? "").toLowerCase();
  if (value === "golf_round" || value === "course" || value === "flight") {
    return "EACH_PAYS_OWN";
  }
  return "PAID_BY_ONE";
}

function costParticipantMembers(cost: TripItemCost, members: TripMember[]) {
  if (cost.participants && cost.participants.length > 0) {
    const memberById = new Map(members.map((member) => [member.id, member]));
    return cost.participants
      .map((participant) => participant.tripMember ?? memberById.get(participant.tripMemberId))
      .filter((member): member is TripMember => Boolean(member));
  }
  return members;
}

function legacyCostForItem(item: TripItem, members: TripMember[]): TripItemCost | null {
  const amount = itemBudgetAmount(item);
  if (amount <= 0) return null;
  const participants = effectiveParticipants(item, members);
  return {
    id: `legacy-${item.id}`,
    label: item.title || itemTypeLabel(item.type),
    amount,
    currency: item.currency || "CHF",
    exchangeRate: item.exchangeRate,
    baseAmount: item.baseAmount,
    costMode: item.costMode || defaultCostModeForItemType(item.type),
    paymentMode: item.paidByMemberId || item.paidByMember ? "PAID_BY_ONE" : "EACH_PAYS_OWN",
    paidByMemberId: item.paidByMemberId || item.paidByMember?.id || null,
    paidByMember: item.paidByMember,
    participants: participants.map((member) => ({
      tripMemberId: member.id,
      tripMember: member,
    })),
  };
}

function budgetCostsForItem(item: TripItem, members: TripMember[]) {
  if (item.costs && item.costs.length > 0) return item.costs;
  const legacyCost = legacyCostForItem(item, members);
  return legacyCost ? [legacyCost] : [];
}

function budgetCostTitle(cost: TripItemCost) {
  return cost.label?.trim() || "Trip cost";
}

function budgetCostAmountText(cost: TripItemCost) {
  const amount = finiteAmount(cost.amount);
  if (amount <= 0) return "Amount not set";
  return formatMoney(amount, cost.currency || "CHF");
}

function budgetCostPaymentText(cost: TripItemCost, members: TripMember[]) {
  if (cost.paymentMode === "EACH_PAYS_OWN") return "everyone pays own part";
  const paidBy =
    cost.paidByMember ??
    members.find((member) => member.id === cost.paidByMemberId);
  return paidBy ? `paid by ${memberDisplayName(paidBy)}` : "paid by one member";
}

function budgetCostParticipantText(cost: TripItemCost, members: TripMember[]) {
  const count = costParticipantMembers(cost, members).length;
  if (count === 0) return "";
  return `shared with ${count} ${count === 1 ? "person" : "people"}`;
}

function itemVisibilityText(item: TripItem, members: TripMember[]) {
  if (item.visibility === "PRIVATE") return "Private";
  if (item.visibility === "SELECTED") {
    const memberById = new Map(members.map((member) => [member.id, member]));
    const names = (item.visibilityMembers ?? [])
      .map((visibilityMember) => memberById.get(visibilityMember.tripMemberId))
      .filter((member): member is TripMember => Boolean(member))
      .map(memberDisplayName);
    return names.length > 0 ? `Selected members: ${names.join(", ")}` : "Selected members";
  }
  return "Group";
}

function timelineCostSummaryText(item: TripItem, members: TripMember[], baseCurrency: string) {
  const costs = budgetCostsForItem(item, members);
  if (costs.length === 0) return "";

  const totalsByCurrency = new Map<string, number>();
  for (const cost of costs) {
    const amount = finiteAmount(cost.amount);
    if (amount <= 0) continue;
    const participantCount = costParticipantMembers(cost, members).length || members.length || 1;
    const total = cost.costMode === "PER_PERSON" ? amount * Math.max(participantCount, 1) : amount;
    const currency = (cost.currency || baseCurrency || "CHF").trim().toUpperCase();
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + total);
  }

  if (totalsByCurrency.size === 1) {
    const [[currency, amount]] = Array.from(totalsByCurrency.entries());
    const amountText = amount > 0 ? formatMoney(amount, currency) : "amount not set";
    return costs.length === 1 ? `Costs: ${amountText}` : `Costs: ${costs.length} entries · ${amountText}`;
  }

  const convertedTotals = costs.map((cost) =>
    totalCostAmountInBaseCurrency(
      cost,
      baseCurrency,
      costParticipantMembers(cost, members).length || members.length || 1,
    ),
  );
  const hasMissingExchangeRate = convertedTotals.some((total) => total.missingExchangeRate);
  const baseTotal = convertedTotals.reduce((sum, total) => sum + total.amount, 0);
  if (!hasMissingExchangeRate && baseTotal > 0) {
    return `Costs: ${costs.length} entries · ${formatMoney(baseTotal, baseCurrency)}`;
  }

  return `Costs: ${costs.length} entries · mixed currencies`;
}

function costLabelExamplesForItemType(type?: string | null) {
  const value = String(type ?? "").toLowerCase();
  if (value === "golf_round" || value === "course") {
    return ["Package price", "Greenfee", "Caddy", "Cart"];
  }
  if (value === "hotel" || value === "stay" || value === "accommodation") {
    return ["Room", "Stay", "Breakfast", "Resort fee"];
  }
  if (value === "flight") {
    return ["Ticket", "Baggage", "Seat reservation"];
  }
  if (value === "transfer" || value === "transport" || value === "car_rental") {
    return ["Rental fee", "Fuel", "Parking", "Damage", "Toll", "Driver tip"];
  }
  if (value === "restaurant") {
    return ["Dinner", "Drinks", "Tip"];
  }
  if (value === "activity" || value === "free_day") {
    return ["Entry fee", "Tour", "Equipment", "Other"];
  }
  return ["Cost name"];
}

function costLabelPlaceholderForItemType(type?: string | null) {
  const examples = costLabelExamplesForItemType(type);
  return examples.length === 1 ? examples[0] : examples.join(", ");
}

const tripCostCategories: TripCostCategory[] = [
  "Flights",
  "Hotels",
  "Golf",
  "Transport",
  "Restaurants",
  "Activities",
  "Other",
];

function costSummaryCategory(type?: string | null): CostSummaryCategory | null {
  const value = String(type ?? "").toLowerCase();
  if (value === "golf" || value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel" || value === "stay" || value === "accommodation") return "Hotel";
  if (value === "flight") return "Flight";
  if (value === "transfer" || value === "transport") return "Transport";
  if (value === "car_rental") return "Car Rental";
  if (value === "restaurant") return "Restaurant";
  if (value === "activity" || value === "free_day") return "Activity";
  return null;
}

function costSummaryCategoryLabel(category: CostSummaryCategory) {
  return category === "Transport" ? "Transfer / Transport" : category;
}

function costSummaryParticipantLabel(category: CostSummaryCategory) {
  if (category === "Golf") return "Played by";
  if (category === "Hotel") return "Stayed";
  if (category === "Restaurant") return "Attended";
  if (category === "Transport" || category === "Flight") return "Passengers";
  if (category === "Car Rental") return "Users";
  return "Participants";
}

function costParticipantIds(cost: TripItemCost, tripMembers: TripMember[]) {
  const explicitIds = (cost.participants ?? [])
    .map((participant) => participant.tripMemberId)
    .filter(Boolean);
  if (explicitIds.length > 0) return explicitIds;
  return tripMembers.map((member) => member.id);
}

type ConvertedCostAmount = {
  amount: number;
  missingExchangeRate: boolean;
};

function costAmountInBaseCurrency(
  cost: TripItemCost,
  baseCurrency: string,
): ConvertedCostAmount {
  const amount = finiteAmount(cost.amount);
  if (amount <= 0) return { amount: 0, missingExchangeRate: false };

  const baseAmount = finiteAmount(cost.baseAmount);
  if (baseAmount > 0) return { amount: baseAmount, missingExchangeRate: false };

  const currency = cost.currency?.trim() || baseCurrency;
  if (currency.toUpperCase() === baseCurrency.toUpperCase()) {
    return { amount, missingExchangeRate: false };
  }

  const exchangeRate = finiteAmount(cost.exchangeRate);
  if (exchangeRate > 0) {
    return { amount: amount * exchangeRate, missingExchangeRate: false };
  }

  return { amount: 0, missingExchangeRate: true };
}

function totalCostAmountInBaseCurrency(
  cost: TripItemCost,
  baseCurrency: string,
  participantCount: number,
) {
  const converted = costAmountInBaseCurrency(cost, baseCurrency);
  if (converted.amount <= 0) return converted;
  return {
    ...converted,
    amount:
      cost.costMode === "PER_PERSON"
        ? converted.amount * Math.max(participantCount, 1)
        : converted.amount,
  };
}

function memberCostShareInBaseCurrency(
  cost: TripItemCost,
  baseCurrency: string,
  participantCount: number,
) {
  const converted = costAmountInBaseCurrency(cost, baseCurrency);
  if (converted.amount <= 0) return converted;
  return {
    ...converted,
    amount:
      cost.costMode === "PER_PERSON"
        ? converted.amount
        : converted.amount / Math.max(participantCount, 1),
  };
}

function costNeedsExchangeRate(cost: TripItemCost, baseCurrency: string) {
  const amount = finiteAmount(cost.amount);
  if (amount <= 0) return false;
  const currency = cost.currency?.trim();
  if (!currency || currency.toUpperCase() === baseCurrency.toUpperCase()) return false;
  if (finiteAmount(cost.baseAmount) > 0) return false;
  return finiteAmount(cost.exchangeRate) <= 0;
}

function draftNeedsExchangeRate(draft: BudgetCostDraft, baseCurrency: string) {
  const amount = optionalNumber(draft.amount);
  if (amount === undefined || amount <= 0) return false;
  const currency = draft.currency.trim();
  if (!currency || currency.toUpperCase() === baseCurrency.toUpperCase()) return false;
  if (optionalNumber(draft.baseAmount) !== undefined) return false;
  return optionalNumber(draft.exchangeRate) === undefined;
}

function TripItemBudgetSection({
  item,
  members,
  baseCurrency,
  canEdit,
  drafts,
  focusedDraftId,
  saving,
  onStartInline,
  onAddDraft,
  onUpdateDraft,
  onDeleteDraft,
  onSave,
  onEdit,
}: {
  item: TripItem;
  members: TripMember[];
  baseCurrency: string;
  canEdit: boolean;
  drafts?: BudgetCostDraft[] | null;
  focusedDraftId?: string | null;
  saving?: boolean;
  onStartInline: (
    item: TripItem,
    event?: React.MouseEvent,
    options?: { addNew?: boolean; costId?: string },
  ) => void;
  onAddDraft: (item: TripItem, event?: React.MouseEvent) => void;
  onUpdateDraft: (localId: string, patch: Partial<BudgetCostDraft>) => void;
  onDeleteDraft: (localId: string) => void;
  onSave: (item: TripItem, event?: React.MouseEvent) => void;
  onEdit: (
    item: TripItem,
    event?: React.MouseEvent,
    options?: { addNew?: boolean; costId?: string },
  ) => void;
}) {
  const costs = budgetCostsForItem(item, members);
  const isInlineEditing = Boolean(drafts);
  if (costs.length === 0 && !canEdit && !isInlineEditing) return null;

  return (
    <section
      style={{
        display: "grid",
        gap: 7,
        padding: 10,
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--bg) 58%, var(--card))",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
            Costs
          </div>
          <div style={{ color: "var(--sub)", fontSize: 11, lineHeight: 1.25 }}>
            Plan or track item costs.
          </div>
        </div>
      </div>

      {isInlineEditing ? (
        <div style={{ display: "grid", gap: 7 }}>
          {(drafts ?? []).map((draft, index) => {
            const paidBy =
              draft.paymentMode === "PAID_BY_ONE"
                ? members.find((member) => member.id === draft.paidByMemberId)
                : null;
            const paymentText =
              draft.paymentMode === "EACH_PAYS_OWN"
                ? "everyone pays own part"
                : paidBy
                  ? `paid by ${memberDisplayName(paidBy)}`
                  : "paid by one member";
            const participantCount = draft.participantMemberIds.length;
            const needsExchangeRate = draftNeedsExchangeRate(draft, baseCurrency);
            const shareHelperText = budgetDraftShareHelperText(draft);
            const splitPreview = budgetDraftPreviewText(draft);
            const costModeWarning = budgetDraftCostModeWarning(draft);

            return (
              <div
                key={draft.localId}
                style={{
                  display: "grid",
                  gap: 6,
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
                    gridTemplateColumns:
                      "minmax(0, 1.35fr) minmax(86px, 0.85fr) minmax(82px, 0.55fr)",
                    gap: 7,
                    alignItems: "end",
                  }}
                >
                  <label style={{ display: "grid", gap: 4, color: "var(--text)", fontSize: 11, fontWeight: 900 }}>
                    Label
                    <input
                      autoFocus={focusedDraftId === draft.localId}
                      value={draft.label}
                      onChange={(event) =>
                        onUpdateDraft(draft.localId, { label: event.target.value })
                      }
                      placeholder={costLabelPlaceholderForItemType(item.type)}
                      style={{ ...editFieldStyle, minHeight: 36, padding: "7px 9px" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4, color: "var(--text)", fontSize: 11, fontWeight: 900 }}>
                    Amount
                    <input
                      type="number"
                      inputMode="decimal"
                      value={draft.amount}
                      onChange={(event) =>
                        onUpdateDraft(draft.localId, { amount: event.target.value })
                      }
                      placeholder={index === 0 ? "120" : undefined}
                      style={{ ...editFieldStyle, minHeight: 36, padding: "7px 9px" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4, color: "var(--text)", fontSize: 11, fontWeight: 900 }}>
                    Currency
                    <select
                      value={draft.currency}
                      onChange={(event) =>
                        onUpdateDraft(draft.localId, { currency: event.target.value })
                      }
                      style={{ ...editFieldStyle, minHeight: 36, padding: "7px 8px" }}
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
                  <span className="fw-pill fw-pill--meta">{paymentText}</span>
                  {participantCount > 0 ? (
                    <span className="fw-pill fw-pill--meta">
                      shared with {participantCount} {participantCount === 1 ? "person" : "people"}
                    </span>
                  ) : null}
                  {needsExchangeRate ? (
                    <span className="fw-pill fw-pill--meta">
                      exchange rate needed
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => onEdit(item, event, { costId: draft.localId })}
                    className="fw-pill fw-pill--meta fw-pill--action"
                    style={{ height: 28, cursor: "pointer", ...secondaryButtonStyle }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDraft(draft.localId)}
                    className="fw-pill fw-pill--meta"
                    style={{ height: 28, cursor: "pointer", ...dangerButtonStyle }}
                  >
                    Delete
                  </button>
                </div>
                <div style={{ color: "var(--sub)", fontSize: 11, lineHeight: 1.3 }}>
                  {shareHelperText}
                </div>
                {splitPreview ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <span className="fw-pill fw-pill--meta">
                      {splitPreview.eachPerson}
                    </span>
                    <span className="fw-pill fw-pill--meta">
                      {splitPreview.totalCost}
                    </span>
                  </div>
                ) : null}
                {costModeWarning ? (
                  <div
                    style={{
                      color: "var(--danger)",
                      fontSize: 11,
                      lineHeight: 1.3,
                      fontWeight: 850,
                    }}
                  >
                    {costModeWarning}
                  </div>
                ) : null}
              </div>
            );
          })}
          {(drafts ?? []).length === 0 ? (
            <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
              No costs added yet.
            </div>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={(event) => onAddDraft(item, event)}
              className="fw-pill fw-pill--meta fw-pill--action"
              style={{ height: 32, cursor: "pointer", ...secondaryButtonStyle }}
            >
              + Add cost
            </button>
            <button
              type="button"
              onClick={(event) => onSave(item, event)}
              disabled={saving}
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                ...primaryButtonStyle,
                cursor: saving ? "default" : "pointer",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              {saving ? "Saving..." : "Save costs"}
            </button>
          </div>
        </div>
      ) : costs.length === 0 ? (
        <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
          <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
            No costs added yet.
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={(event) => onStartInline(item, event, { addNew: true })}
              className="fw-pill fw-pill--meta fw-pill--action"
              style={{ height: 32, cursor: "pointer", ...secondaryButtonStyle }}
            >
              + Add cost
            </button>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {costs.map((cost) => {
            const needsExchangeRate = costNeedsExchangeRate(cost, baseCurrency);

            return (
              <div
                key={cost.id}
                style={{
                  display: "grid",
                  gap: 4,
                  padding: "8px 9px",
                  borderRadius: 12,
                  border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  background: "color-mix(in srgb, var(--card) 86%, var(--bg))",
                  minWidth: 0,
                }}
              >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    color: "var(--text)",
                    fontSize: 12,
                    lineHeight: 1.25,
                    fontWeight: 950,
                    overflowWrap: "anywhere",
                    minWidth: 0,
                  }}
                >
                  {budgetCostTitle(cost)}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flex: "0 0 auto",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text)",
                      fontSize: 12,
                      lineHeight: 1.25,
                      fontWeight: 950,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {budgetCostAmountText(cost)}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={(event) => onStartInline(item, event, { costId: cost.id })}
                      className="fw-pill fw-pill--meta fw-pill--action"
                      style={{ height: 28, cursor: "pointer", ...secondaryButtonStyle }}
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 5,
                  alignItems: "center",
                }}
              >
                <span className="fw-pill fw-pill--meta">
                  {costModeText(cost.costMode)}
                </span>
                <span className="fw-pill fw-pill--meta">
                  {budgetCostPaymentText(cost, members)}
                </span>
                {budgetCostParticipantText(cost, members) ? (
                  <span className="fw-pill fw-pill--meta">
                    {budgetCostParticipantText(cost, members)}
                  </span>
                ) : null}
                {needsExchangeRate ? (
                  <span className="fw-pill fw-pill--meta">
                    exchange rate needed
                  </span>
                ) : null}
              </div>
            </div>
            );
          })}
          {canEdit ? (
            <button
              type="button"
              onClick={(event) => onStartInline(item, event, { addNew: true })}
              className="fw-pill fw-pill--meta fw-pill--action"
              style={{
                height: 32,
                width: "fit-content",
                cursor: "pointer",
                ...secondaryButtonStyle,
              }}
            >
              + Add cost
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function toFiniteNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function markerTypeStyles(typeKey: string) {
  const value = String(typeKey ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") {
    return {
                        background: "var(--accent)",
                        color: "#f8fbf6",
      ring: "var(--card)",
      glyph: "G",
    };
  }

  if (value === "hotel") {
    return {
      background: "var(--card)",
      color: "var(--text)",
      ring: "var(--text)",
      glyph: "H",
    };
  }

  if (value === "transfer" || value === "transport" || value === "car_rental") {
    return {
      background: "var(--bg)",
      color: "var(--text)",
      ring: "var(--sub)",
      glyph: "T",
    };
  }

  if (value === "restaurant") {
    return {
      background: "var(--bg)",
      color: "var(--text)",
      ring: "#d15f32",
      glyph: "R",
    };
  }

  if (value === "free_day") {
    return {
      background: "var(--bg)",
      color: "var(--sub)",
      ring: "var(--text)",
      glyph: "A",
    };
  }

  return {
    background: "var(--card)",
    color: "var(--sub)",
    ring: "var(--border)",
    glyph: "O",
  };
}

function tripMarkerIcon(marker: TripMapMarker) {
  const styles = markerTypeStyles(marker.typeKey);

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${styles.background};
        color: ${styles.color};
        border: 2px solid ${styles.ring};
        box-shadow: 0 4px 14px rgba(0,0,0,.22);
        font: 950 11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <span style="
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          line-height: 1;
        ">
          <span>${marker.number}</span>
          <span style="font-size: 8px;">${styles.glyph}</span>
        </span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function FitTripMapBounds({ markers }: { markers: TripMapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    window.setTimeout(() => map.invalidateSize(), 50);

    if (markers.length === 0) return;

    const points = markers.map((marker) => [marker.lat, marker.lon] as [
      number,
      number,
    ]);
    const bounds = L.latLngBounds(points);

    if (markers.length === 1) {
      map.setView(points[0], 13);
      return;
    }

    map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 12,
    });
  }, [map, markers]);

  return null;
}

function TripMapView({
  markers,
  onOpenCourse,
}: {
  markers: TripMapMarker[];
  onOpenCourse: (courseId: string) => void;
}) {
  const center = useMemo<[number, number]>(() => {
    const first = markers[0];
    return first ? [first.lat, first.lon] : [20, 0];
  }, [markers]);
  const line = markers.map((marker) => [marker.lat, marker.lon] as [
    number,
    number,
  ]);

  if (markers.length === 0) {
    return (
      <section style={{ display: "grid", gap: 0 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--sub)",
            fontSize: 13,
            display: "grid",
            gap: 4,
          }}
        >
          <div style={{ color: "var(--text)", fontWeight: 950 }}>
            No mapped stops yet
          </div>
          <div>
            Add a linked course or a timeline item with coordinates to see it on the trip map.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 0 }}>
      <div
        data-trip-swipe-ignore="true"
        style={{
          height: "calc(100dvh - 112px)",
          minHeight: 520,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <MapContainer
          center={center}
          zoom={8}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution={satelliteTileAttribution}
            url={satelliteTileUrl}
          />
          <TileLayer
            attribution={satelliteTileAttribution}
            url={satelliteLabelsUrl}
          />
          <FitTripMapBounds markers={markers} />

          {line.length > 1 ? (
            <Polyline
              positions={line}
              pathOptions={{
                color: "var(--text)",
                opacity: 0.72,
                weight: 3,
              }}
            />
          ) : null}

          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lon]}
              icon={tripMarkerIcon(marker)}
            >
              <Popup>
                <div
                  style={{
                    minWidth: 210,
                    display: "grid",
                    gap: 9,
                    color: "var(--text)",
                    fontFamily: "system-ui",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          padding: "3px 7px",
                          color: "var(--sub)",
                          fontSize: 11,
                          fontWeight: 950,
                        }}
                      >
                        {marker.number}. {marker.typeLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 950,
                        fontSize: 14,
                        lineHeight: 1.25,
                      }}
                    >
                      {marker.title}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      color: "var(--sub)",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <span>{marker.dateLabel}</span>
                    {marker.timeLabel ? <span>{marker.timeLabel}</span> : null}
                  </div>
                  {marker.courseName ||
                  marker.locationName ||
                  marker.address ? (
                    <div style={{ display: "grid", gap: 5, fontSize: 12 }}>
                      {marker.courseName ? (
                        <div style={{ color: "var(--sub)", lineHeight: 1.35 }}>
                          <span style={{ fontWeight: 950 }}>Course </span>
                          <span style={{ color: "var(--text)" }}>
                            {marker.courseName}
                          </span>
                        </div>
                      ) : null}
                      {marker.locationName ? (
                        <div style={{ color: "var(--sub)", lineHeight: 1.35 }}>
                          <span style={{ fontWeight: 950 }}>Location </span>
                          <span style={{ color: "var(--text)" }}>
                            {marker.locationName}
                          </span>
                        </div>
                      ) : null}
                      {marker.address ? (
                        <div style={{ color: "var(--sub)", lineHeight: 1.35 }}>
                          <span style={{ fontWeight: 950 }}>Address </span>
                          <span style={{ color: "var(--text)" }}>
                            {marker.address}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {marker.courseId ? (
                    <button
                      type="button"
                      onClick={() => onOpenCourse(marker.courseId as string)}
                      style={{
                        width: "fit-content",
                        height: 30,
                        padding: "0 10px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--sub)",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 12,
                      }}
                    >
                      Open course
                    </button>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

function TripCalendarView({
  days,
  items,
  members,
  baseCurrency,
  selectedDay,
  onSelectDay,
  canEditTrip,
  onAddItem,
  canEditItem,
  onEditItem,
  onOpenCourse,
  onOpenDetails,
}: {
  days: CalendarDay[];
  items: TripItem[];
  members: TripMember[];
  baseCurrency: string;
  selectedDay: string;
  onSelectDay: (key: string) => void;
  canEditTrip: boolean;
  onAddItem: (date?: string) => void;
  canEditItem: (item: TripItem) => boolean;
  onEditItem: (item: TripItem, event?: React.MouseEvent) => void;
  onOpenCourse: (courseId: string) => void;
  onOpenDetails: (item: TripItem, event?: React.MouseEvent) => void;
}) {
  const selected = days.find((day) => day.key === selectedDay) ?? days[0];
  const calendarTodayKey = new Date().toISOString().slice(0, 10);
  const selectedItems = useMemo(() => {
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => calendarItemMatchesDay(item, selected?.key ?? ""))
      .sort((a, b) => {
        const timeCompare = timeSortValue(a.item).localeCompare(timeSortValue(b.item));
        if (timeCompare !== 0) return timeCompare;
        return a.index - b.index;
      })
      .map(({ item }) => item);
  }, [items, selected?.key]);
  const sections = useMemo(() => {
    const grouped = new Map<CalendarSection, TripItem[]>();
    const order: CalendarSection[] = [
      "Flights",
      "Golf",
      "Hotel",
      "Transfers / Car",
      "Restaurant",
      "Other",
    ];

    for (const item of selectedItems) {
      const section = calendarSection(item.type);
      grouped.set(section, [...(grouped.get(section) ?? []), item]);
    }

    return order
      .map((section) => [section, grouped.get(section) ?? []] as const)
      .filter(([, items]) => items.length > 0);
  }, [selectedItems]);

  if (days.length === 0) {
    return (
      <section style={{ display: "grid", gap: 0 }}>
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 16,
            borderRadius: 14,
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ color: "var(--text)", fontWeight: 950 }}>
            No calendar days yet
          </div>
          <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
            {canEditTrip
              ? "Add dated timeline items to build the day-by-day trip sheet."
              : "Trip admins have not added dated timeline items yet."}
          </div>
          {canEditTrip ? (
            <button
              type="button"
              onClick={() => onAddItem()}
              style={{
                width: "fit-content",
                height: 34,
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
              + Add first item
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "grid", gap: 10, minWidth: 0 }}>
      <div
        data-trip-swipe-ignore="true"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "0 0 4px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          overscrollBehaviorX: "contain",
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
          alignItems: "stretch",
        } as React.CSSProperties}
      >
        {days.map((day) => {
          const active = day.key === selected.key;
          const dateParts = calendarDateParts(day.key);
          const indicators = Object.entries(day.indicators).filter(
            ([, count]) => count > 0,
          ) as [CalendarIndicator, number][];

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDay(day.key)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                flex: "0 0 62px",
                width: 62,
                height: 64,
                textAlign: "center",
                padding: 0,
                borderRadius: 0,
                overflow: "visible",
                border: "1px solid transparent",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                display: "block",
                boxSizing: "border-box",
              }}
            >
              <div
                className="fw-trip-calendar-day-surface"
                style={{
                  width: "100%",
                  height: "100%",
                  padding: "5px 5px",
                  borderRadius: 12,
                  overflow: "hidden",
                  "--fw-trip-calendar-day-bg": active
                    ? "var(--accent)"
                    : "transparent",
                  "--fw-trip-calendar-day-color": active
                    ? "#f8fbf6"
                    : "var(--text)",
                  background: active ? "var(--accent)" : "transparent",
                  backgroundClip: "padding-box",
                  color: active ? "#f8fbf6" : "var(--text)",
                  WebkitMaskImage: "-webkit-radial-gradient(white, black)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  boxSizing: "border-box",
                  boxShadow: active
                    ? "0 6px 14px rgba(0,0,0,0.16), inset 0 0 0 1px color-mix(in srgb, var(--accent-strong) 56%, transparent)"
                    : "none",
                } as React.CSSProperties}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: 1.1,
                    opacity: active ? 0.72 : 0.68,
                  }}
                >
                  {day.weekday}
                </div>
                <div style={{ display: "grid", gap: 1, justifyItems: "center" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dateParts.dayMonth}
                  </div>
                  {dateParts.year ? (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        lineHeight: 1.1,
                        opacity: active ? 0.76 : 0.6,
                      }}
                    >
                      {dateParts.year}
                    </div>
                  ) : null}
                </div>
                {day.key === calendarTodayKey ? (
                  <div style={{ fontSize: 8, fontWeight: 500, lineHeight: 1 }}>
                    Today
                  </div>
                ) : null}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 2,
                    height: 8,
                    maxWidth: "100%",
                  }}
                >
                  {indicators.slice(0, 3).map(([label, count]) => (
                    <span
                      key={label}
                      title={`${label} ${count}`}
                      style={{
                        width: count > 1 ? "auto" : 5,
                        height: count > 1 ? 8 : 5,
                        minWidth: 5,
                        borderRadius: 999,
                        border: "1px solid currentColor",
                        padding: count > 1 ? "0 3px" : 0,
                        fontSize: 7,
                        lineHeight: count > 1 ? "8px" : "5px",
                        fontWeight: 500,
                        opacity: active ? 0.82 : 0.58,
                        boxSizing: "border-box",
                      }}
                    >
                      {count > 1 ? count : ""}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: 10, paddingTop: 2, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ color: "var(--text)", fontSize: 16, fontWeight: 950 }}>
            {selected.label} - Day activity
          </div>
          {canEditTrip && selected.key !== "unscheduled" ? (
            <button
              type="button"
              onClick={() => onAddItem(selected.key)}
              style={{
                flex: "0 0 auto",
                height: 28,
                padding: "0 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              + Add item
            </button>
          ) : null}
        </div>

        {sections.map(([section, items]) => (
          <div key={section} style={{ display: "grid", gap: 0 }}>
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((item) => {
                const itemType = String(item.type ?? "").toLowerCase();
                const isGolf =
                  itemType === "golf_round" || itemType === "course";
                const courseId = item.course?.id ?? item.courseId;
                const canEditCurrentItem = canEditItem(item);
                const accent = calendarItemAccent(item);
                const whenLine = compactItemWhenLine(item, selected.key);
                const whereLine = compactItemWhereLine(item);
                const isFlight = isFlightItem(item);
                const flightSummary = isFlight ? flightSummaryLine(item) : "";
                const providerLine =
                  !isFlight && item.provider?.trim() ? item.provider.trim() : "";
                const compactCostSummary = timelineCostSummaryText(
                  item,
                  members,
                  baseCurrency,
                );

                return (
                  <article
                    key={`${selected.key}-${item.id}-${section}`}
                    style={{
                      display: "grid",
                      gap: 0,
                      borderRadius: 16,
                      overflow: "hidden",
                      border: `1px solid ${accent.border}`,
                      background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
                      boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
                    }}
                  >
                    <TripItemCardHeader
                      item={item}
                      displayKey={selected.key}
                      onTitleClick={
                        isGolf && courseId ? () => onOpenCourse(courseId) : undefined
                      }
                    />

                    <div
                      style={{
                        display: "grid",
                        gap: isFlight ? 6 : 8,
                        padding: isFlight ? 8 : 11,
                      }}
                    >
                      {flightSummary || whereLine || whenLine || compactCostSummary || providerLine ? (
                        <div
                          style={{
                            display: "grid",
                            gap: 4,
                            color: "var(--text)",
                            fontSize: 12,
                            lineHeight: 1.28,
                            fontWeight: 900,
                          }}
                        >
                          {flightSummary ? <div>{flightSummary}</div> : null}
                          {!isFlight && whereLine ? <div>{whereLine}</div> : null}
                          {whenLine ? <div style={{ color: "var(--sub)" }}>{whenLine}</div> : null}
                          {compactCostSummary ? (
                            <div style={{ color: "var(--sub)" }}>{compactCostSummary}</div>
                          ) : null}
                          {providerLine ? (
                            <div style={{ color: "var(--sub)" }}>{providerLine}</div>
                          ) : null}
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                      {isGolf && courseId ? (
                        <button
                          type="button"
                          className="fw-pill fw-pill--meta fw-pill--action"
                          onClick={() => onOpenCourse(courseId)}
                          style={{
                            width: "fit-content",
                            cursor: "pointer",
                            ...secondaryButtonStyle,
                          }}
                        >
                          Open course
                        </button>
                      ) : null}
                      {tripItemMapActions(item).map((action) => (
                        <a
                          key={`${selected.key}-${item.id}-${action.label}`}
                          className="fw-pill fw-pill--meta fw-pill--action"
                          href={action.href}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            width: "fit-content",
                            textDecoration: "none",
                            ...secondaryButtonStyle,
                          }}
                        >
                          {action.label}
                        </a>
                      ))}
                      <button
                        type="button"
                        className="fw-pill fw-pill--meta fw-pill--action"
                        onClick={(event) => onOpenDetails(item, event)}
                        style={{
                          width: "fit-content",
                          cursor: "pointer",
                          ...secondaryButtonStyle,
                        }}
                      >
                        Details
                      </button>
                      {canEditCurrentItem ? (
                        <button
                          type="button"
                          className="fw-pill fw-pill--meta fw-pill--action"
                          onClick={(event) => onEditItem(item, event)}
                          style={{
                            width: "fit-content",
                            cursor: "pointer",
                            ...secondaryButtonStyle,
                          }}
                        >
                          Edit
                        </button>
                      ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MemberAvatar({
  user,
  label,
}: {
  user?: UserSearchResult | null;
  label?: string;
}) {
  const displayLabel = label || displayUserName(user);

  if (user?.avatarUrl) {
    return (
      <img
        src={fileUrl(user.avatarUrl)}
        alt={displayLabel}
        style={{
          width: memberAvatarSize,
          height: memberAvatarSize,
          minWidth: memberAvatarSize,
          maxWidth: memberAvatarSize,
          minHeight: memberAvatarSize,
          maxHeight: memberAvatarSize,
          boxSizing: "border-box",
          borderRadius: 999,
          objectFit: "cover",
          display: "block",
          border: "1px solid var(--border)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: memberAvatarSize,
        height: memberAvatarSize,
        minWidth: memberAvatarSize,
        maxWidth: memberAvatarSize,
        minHeight: memberAvatarSize,
        maxHeight: memberAvatarSize,
        boxSizing: "border-box",
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        fontWeight: 950,
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {displayLabel.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function TripDetailPage() {
  const { tripId } = useParams();
  const nav = useNavigate();
  const { token, user, logout } = useAuth();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const teeTimesSectionRef = useRef<HTMLElement | null>(null);
  const checklistSectionRef = useRef<HTMLElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showingCachedTrip, setShowingCachedTrip] = useState(false);
  const [cachedTripAt, setCachedTripAt] = useState<string | null>(null);
  const [refreshTripMessage, setRefreshTripMessage] = useState<string | null>(
    null,
  );
  const [activeView, setActiveView] = useState<TripView>("overview");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState("");
  const [checkedChecklistIds, setCheckedChecklistIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [checkedTeeTimeChecklistIds, setCheckedTeeTimeChecklistIds] = useState<
    Map<string, Set<string>>
  >(() => new Map());
  const [settlementCopied, setSettlementCopied] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [tripDraft, setTripDraft] = useState<TripEditDraft | null>(null);
  const [savingTrip, setSavingTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [deleteTripConfirmOpen, setDeleteTripConfirmOpen] = useState(false);
  const [deleteTripTitleInput, setDeleteTripTitleInput] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [budgetEditingItemId, setBudgetEditingItemId] = useState<string | null>(null);
  const [budgetDrafts, setBudgetDrafts] = useState<BudgetCostDraft[]>([]);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [costSummaryDrilldown, setCostSummaryDrilldown] =
    useState<CostSummaryDrilldown | null>(null);
  const [expandedBudgetCostId, setExpandedBudgetCostId] = useState<string | null>(null);
  const [savingBudgetItemId, setSavingBudgetItemId] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [guestName, setGuestName] = useState("");
  const [memberResults, setMemberResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
    null,
  );
  const [newMemberRole, setNewMemberRole] = useState<TripRole>("MEMBER");
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<TripInvite | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsErr, setDocumentsErr] = useState<string | null>(null);
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState<
    TripDocumentCategory | "ALL"
  >("ALL");
  const [documentDraft, setDocumentDraft] = useState<TripDocumentDraft>({
    title: "",
    note: "",
    category: "GENERAL",
    visibility: "SHARED",
    file: null,
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null,
  );
  const [itemDocumentUploadFile, setItemDocumentUploadFile] = useState<File | null>(null);
  const [itemDocumentUploadState, setItemDocumentUploadState] = useState<
    "idle" | "uploading" | "uploaded" | "failed"
  >("idle");
  const [itemDocumentUploadMessage, setItemDocumentUploadMessage] = useState("");
  const [activity, setActivity] = useState<TripActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityErr, setActivityErr] = useState<string | null>(null);
  const [myCostsData, setMyCostsData] = useState<MyTripCostsResponse | null>(null);
  const [myCostsLoading, setMyCostsLoading] = useState(false);
  const [myCostsErr, setMyCostsErr] = useState<string | null>(null);
  const [expandedMyCostId, setExpandedMyCostId] = useState<string | null>(null);
  const [organizerCostsData, setOrganizerCostsData] =
    useState<OrganizerTripCostsResponse | null>(null);
  const [organizerCostsLoading, setOrganizerCostsLoading] = useState(false);
  const [organizerCostsErr, setOrganizerCostsErr] = useState<string | null>(null);
  const [expandedOrganizerCostId, setExpandedOrganizerCostId] = useState<string | null>(null);

  const myMembership = trip?.members?.find((member) => member.userId === user?.id);
  const canEditTrip =
    myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";
  const canAddTripItems = Boolean(myMembership);
  const canUploadTripDocuments = Boolean(myMembership);
  const myCostsCurrency = myCostsData?.baseCurrency || trip?.baseCurrency?.trim() || "CHF";
  const myCostsBalancePreview = myCostsData?.summary.balancePreview ?? 0;
  const myCostsOwedToMe = myCostsOwedToMeBreakdown(myCostsData);
  const myCostsIOwe = myCostsIOweBreakdown(myCostsData);
  const organizerCostsCurrency =
    organizerCostsData?.baseCurrency || trip?.baseCurrency?.trim() || "CHF";

  function canEditTripItem(item: TripItem) {
    if (canEditTrip) return true;
    if (!user?.id) return false;
    if (item.visibility === "PRIVATE" && item.createdByUserId !== user.id) {
      return false;
    }
    return item.createdByUserId === user.id;
  }

  function moveSubview(direction: 1 | -1) {
    if (activeView === "overview") return;

    const currentIndex = subviewOrder.indexOf(activeView);
    if (currentIndex < 0) return;

    const next = subviewOrder[currentIndex + direction];
    if (next) setActiveView(next);
  }

  function handleSubviewTouchStart(event: React.TouchEvent<HTMLElement>) {
    if (
      activeView === "overview" ||
      event.touches.length !== 1 ||
      shouldIgnoreTripSwipe(event.target)
    ) {
      swipeStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleSubviewTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || activeView === "overview") return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;

    moveSubview(dx < 0 ? 1 : -1);
  }

  function toggleChecklistItem(itemId: string) {
    if (!tripId) return;

    setCheckedChecklistIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      writeTravelChecklist(tripId, next);
      return next;
    });
  }

  function openOverviewSection(ref: React.RefObject<HTMLElement>) {
    setActiveView("overview");
    window.setTimeout(() => {
      const top =
        (ref.current?.getBoundingClientRect().top ?? 0) +
        window.scrollY -
        12;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, 0);
  }

  function openSubview(view: Exclude<TripView, "overview">) {
    setActiveView(view);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 0);
  }

  function addItemPath(date?: string) {
    const base = `/trips/${tripId}/add-item`;
    return date && date !== "unscheduled"
      ? `${base}?date=${encodeURIComponent(date)}`
      : base;
  }

  async function loadTrip() {
    if (!token || !tripId) return;

    const visibleTrip = trip;

    try {
      setLoading(true);
      setErr(null);
      setRefreshTripMessage(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logout();
          throw new Error("Your session has expired. Please login again.");
        }
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      const data = (await res.json()) as Trip;
      const cachedAt = writeCachedTrip(tripId, data);
      setTrip(data);
      if (Array.isArray(data.documents)) setDocuments(data.documents);
      setCachedTripAt(cachedAt);
      setShowingCachedTrip(false);
      setRefreshTripMessage(null);
    } catch (e: any) {
      const cachedTrip = readCachedTrip(tripId);
      if (cachedTrip) {
        setTrip(cachedTrip.trip);
        setCachedTripAt(cachedTrip.cachedAt);
        setShowingCachedTrip(true);
        setErr(null);
        if (visibleTrip) {
          setRefreshTripMessage("Could not update, showing saved data.");
        }
        return;
      }

      if (visibleTrip) {
        setTrip(visibleTrip);
        setCachedTripAt((current) => current);
        setShowingCachedTrip(true);
        setErr(null);
        setRefreshTripMessage("Could not update, showing saved data.");
        return;
      }

      setShowingCachedTrip(false);
      setCachedTripAt(null);
      setErr(friendlyApiErrorMessage(e, "Failed to load trip."));
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshCostViews() {
    if (!token || !tripId) return;

    try {
      const myData = await getMyTripCosts(tripId, token);
      setMyCostsData(myData);
      setMyCostsErr(null);
    } catch (error) {
      setMyCostsErr(friendlyApiErrorMessage(error, "Failed to load my costs."));
    }

    if (canEditTrip) {
      try {
        const organizerData = await getOrganizerTripCosts(tripId, token);
        setOrganizerCostsData(organizerData);
        setOrganizerCostsErr(null);
      } catch (error) {
        setOrganizerCostsErr(
          friendlyApiErrorMessage(error, "Failed to load organizer costs."),
        );
      }
    }
  }

  useEffect(() => {
    loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tripId]);

  useEffect(() => {
    if (!token || !tripId) {
      setMyCostsData(null);
      setMyCostsErr(null);
      return;
    }

    const activeToken = token;
    const activeTripId = tripId;
    let cancelled = false;

    async function loadMyCosts() {
      try {
        setMyCostsLoading(true);
        setMyCostsErr(null);
        const data = await getMyTripCosts(activeTripId, activeToken);
        if (!cancelled) setMyCostsData(data);
      } catch (error) {
        if (!cancelled) {
          setMyCostsData(null);
          setMyCostsErr(
            friendlyApiErrorMessage(error, "Failed to load my costs."),
          );
        }
      } finally {
        if (!cancelled) setMyCostsLoading(false);
      }
    }

    void loadMyCosts();

    return () => {
      cancelled = true;
    };
  }, [token, tripId]);

  useEffect(() => {
    if (!token || !tripId || !canEditTrip) {
      setOrganizerCostsData(null);
      setOrganizerCostsErr(null);
      return;
    }

    const activeToken = token;
    const activeTripId = tripId;
    let cancelled = false;

    async function loadOrganizerCosts() {
      try {
        setOrganizerCostsLoading(true);
        setOrganizerCostsErr(null);
        const data = await getOrganizerTripCosts(activeTripId, activeToken);
        if (!cancelled) setOrganizerCostsData(data);
      } catch (error) {
        if (!cancelled) {
          setOrganizerCostsData(null);
          setOrganizerCostsErr(
            friendlyApiErrorMessage(error, "Failed to load organizer costs."),
          );
        }
      } finally {
        if (!cancelled) setOrganizerCostsLoading(false);
      }
    }

    void loadOrganizerCosts();

    return () => {
      cancelled = true;
    };
  }, [canEditTrip, token, tripId]);

  useEffect(() => {
    setCheckedChecklistIds(tripId ? readTravelChecklist(tripId) : new Set());
    setCheckedTeeTimeChecklistIds(
      tripId ? readTeeTimeChecklist(tripId) : new Map(),
    );
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    writeTeeTimeChecklist(tripId, checkedTeeTimeChecklistIds);
  }, [tripId, checkedTeeTimeChecklistIds]);

  async function loadDocuments() {
    if (!token || !tripId) return;

    try {
      setDocumentsLoading(true);
      setDocumentsErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/documents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setDocumentsErr(e?.message ?? "Failed to load trip documents");
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function loadActivity() {
    if (!token || !tripId) return;

    try {
      setActivityLoading(true);
      setActivityErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/activity`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      const data = await res.json();
      setActivity(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setActivityErr(e?.message ?? "Failed to load trip activity");
    } finally {
      setActivityLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tripId]);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tripId]);

  useEffect(() => {
    let cancelled = false;

    async function searchUsers() {
      if (!token || !canEditTrip) {
        setMemberResults([]);
        return;
      }

      const q = memberQuery.trim();
      if (q.length < 2 || selectedUser) {
        setMemberResults([]);
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/users/search?q=${encodeURIComponent(q)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) {
          if (!cancelled) setMemberResults([]);
          return;
        }

        const data = await res.json();
        const existingIds = new Set(
          (trip?.members ?? [])
            .map((member) => member.userId)
            .filter((id): id is string => Boolean(id)),
        );
        const items = (Array.isArray(data) ? data : [])
          .filter((item: UserSearchResult) => !existingIds.has(item.id))
          .slice(0, 8);

        if (!cancelled) setMemberResults(items);
      } catch {
        if (!cancelled) setMemberResults([]);
      }
    }

    searchUsers();

    return () => {
      cancelled = true;
    };
  }, [canEditTrip, memberQuery, selectedUser, token, trip?.members]);

  function startEdit(item: TripItem) {
    setErr(null);
    setEditingItemId(item.id);
    const canUseGroupVisibility = canEditTrip;
    const itemVisibility = item.visibility || (canUseGroupVisibility ? "GROUP" : "PRIVATE");
    const editableVisibility =
      itemVisibility === "GROUP" && !canUseGroupVisibility ? "PRIVATE" : itemVisibility;
    const savedVisibilityMemberIds =
      item.visibilityMembers && item.visibilityMembers.length > 0
        ? item.visibilityMembers.map((visibilityMember) => visibilityMember.tripMemberId)
        : [];
    const visibleToMemberIds =
      editableVisibility === "SELECTED"
        ? savedVisibilityMemberIds.length > 0
          ? savedVisibilityMemberIds
          : myMembership?.id
            ? [myMembership.id]
            : []
        : savedVisibilityMemberIds;
    const documentIds = linkedDocumentsForItem(item, documents).map(
      (document) => document.id,
    );
    setEditDraft({
      type: item.type || "note",
      title: item.title || "",
      date: dateInputValue(item),
      endDate: endDateInputValue(item),
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      provider: item.provider || "",
      notes: item.notes || "",
      locationName: item.locationName || "",
      address: item.address || "",
      bookingRef: item.bookingRef || "",
      visibility: editableVisibility,
      visibleToMemberIds,
      documentIds,
    });
    if (itemTypeSupportsCosts(item.type)) {
      setBudgetEditingItemId(item.id);
      setBudgetDrafts(budgetDraftsForItem(item).drafts);
      setExpandedBudgetCostId(null);
      setBudgetModalOpen(false);
    } else {
      setBudgetEditingItemId(null);
      setBudgetDrafts([]);
      setExpandedBudgetCostId(null);
      setBudgetModalOpen(false);
    }
  }

  function openItemEdit(item: TripItem, event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    startEdit(item);
    setItemDocumentUploadFile(null);
    setItemDocumentUploadState("idle");
    setItemDocumentUploadMessage("");
    setActiveView("timeline");
    window.setTimeout(() => {
      document
        .getElementById(tripItemDomId(item.id))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function openItemDetails(item: TripItem, event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    setDetailsItemId(item.id);
    setActiveView("timeline");
    window.setTimeout(() => {
      document
        .getElementById(tripItemDomId(item.id))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function defaultBudgetParticipantIds(item: TripItem) {
    if (item.participants && item.participants.length > 0) {
      return item.participants.map((participant) => participant.tripMemberId);
    }
    return (trip?.members ?? []).map((member) => member.id);
  }

  function defaultBudgetPaidByMemberId() {
    if (myMembership?.id) return myMembership.id;
    const organiser = (trip?.members ?? []).find(
      (member) => member.role === "OWNER" || member.role === "ADMIN",
    );
    return organiser?.id || trip?.members?.[0]?.id || "";
  }

  function newBudgetDraft(item: TripItem): BudgetCostDraft {
    const participantMemberIds = defaultBudgetParticipantIds(item);
    const paymentMode = defaultPaymentModeForItemType(item.type);
    const costMode =
      paymentMode === "EACH_PAYS_OWN" && participantMemberIds.length > 1
        ? "TOTAL"
        : defaultCostModeForItemType(item.type);
    return {
      localId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label: "",
      amount: "",
      currency: trip?.baseCurrency || item.currency || "CHF",
      exchangeRate: "",
      baseAmount: "",
      costMode,
      paymentMode,
      paidByMemberId: defaultBudgetPaidByMemberId(),
      participantMemberIds,
    };
  }

  function budgetDraftFromCost(cost: TripItemCost, item: TripItem): BudgetCostDraft {
    return {
      localId: cost.id || `cost-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label: cost.label || item.title || itemTypeLabel(item.type),
      amount: numberInputValue(cost.amount),
      currency: cost.currency || trip?.baseCurrency || item.currency || "CHF",
      exchangeRate: numberInputValue(cost.exchangeRate),
      baseAmount: numberInputValue(cost.baseAmount),
      costMode: cost.costMode || defaultCostModeForItemType(item.type),
      paymentMode: cost.paymentMode || defaultPaymentModeForItemType(item.type),
      paidByMemberId:
        cost.paidByMemberId ||
        cost.paidByMember?.id ||
        defaultBudgetPaidByMemberId(),
      participantMemberIds:
        cost.participants && cost.participants.length > 0
          ? cost.participants.map((participant) => participant.tripMemberId)
          : defaultBudgetParticipantIds(item),
    };
  }

  function budgetDraftsForItem(
    item: TripItem,
    options?: { addNew?: boolean },
  ) {
    const costs = budgetCostsForItem(item, trip?.members ?? []);
    const drafts = costs.map((cost) => budgetDraftFromCost(cost, item));
    const newDraft = options?.addNew || drafts.length === 0 ? newBudgetDraft(item) : null;
    return {
      drafts: newDraft ? [...drafts, newDraft] : drafts,
      newDraft,
    };
  }

  function startBudgetInlineEdit(
    item: TripItem,
    event?: React.MouseEvent,
    options?: { addNew?: boolean; costId?: string },
  ) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!canEditTripItem(item)) return;

    const { drafts, newDraft } = budgetDraftsForItem(item, options);
    setErr(null);
    setBudgetEditingItemId(item.id);
    setBudgetDrafts(drafts);
    setExpandedBudgetCostId(
      newDraft?.localId ||
        (options?.costId && drafts.some((draft) => draft.localId === options.costId)
          ? options.costId
          : null),
    );
    setBudgetModalOpen(false);
  }

  function openBudgetEdit(
    item: TripItem,
    event?: React.MouseEvent,
    options?: { addNew?: boolean; costId?: string },
  ) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!canEditTripItem(item)) return;

    const activeDrafts =
      budgetEditingItemId === item.id && budgetDrafts.length > 0
        ? budgetDrafts
        : budgetDraftsForItem(item, options).drafts;
    const newDraft =
      options?.addNew && budgetEditingItemId === item.id
        ? newBudgetDraft(item)
        : null;
    const nextDrafts = newDraft ? [...activeDrafts, newDraft] : activeDrafts;
    setErr(null);
    setBudgetEditingItemId(item.id);
    setBudgetDrafts(nextDrafts);
    setExpandedBudgetCostId(
      newDraft?.localId ||
        (options?.costId && nextDrafts.some((draft) => draft.localId === options.costId)
          ? options.costId
          : nextDrafts[0]?.localId || null),
    );
    setBudgetModalOpen(true);
  }

  function closeBudgetEdit() {
    if (savingBudgetItemId) return;
    setBudgetModalOpen(false);
    setBudgetEditingItemId(null);
    setBudgetDrafts([]);
    setExpandedBudgetCostId(null);
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
    const item = trip?.items?.find((candidate) => candidate.id === budgetEditingItemId);
    if (!item) return;
    const draft = newBudgetDraft(item);
    setBudgetDrafts((drafts) => [...drafts, draft]);
    setExpandedBudgetCostId(draft.localId);
  }

  function addBudgetDraftInline(item: TripItem, event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!canEditTripItem(item)) return;

    if (budgetEditingItemId !== item.id) {
      startBudgetInlineEdit(item, event, { addNew: true });
      return;
    }

    const draft = newBudgetDraft(item);
    setBudgetDrafts((drafts) => [...drafts, draft]);
    setExpandedBudgetCostId(draft.localId);
    setBudgetModalOpen(false);
  }

  function deleteBudgetDraft(localId: string) {
    setBudgetDrafts((drafts) => drafts.filter((draft) => draft.localId !== localId));
    setExpandedBudgetCostId((current) => (current === localId ? null : current));
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
          exchangeRate: isBaseCurrency
            ? 1
            : optionalNumber(draft.exchangeRate),
          baseAmount: isBaseCurrency
            ? amount
            : optionalNumber(draft.baseAmount),
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

  function validateBudgetPayloadCosts(costs: ReturnType<typeof budgetPayloadCosts>) {
    if (costs.some((cost) => !cost.label || cost.amount === undefined)) {
      return "Each cost needs a label and amount.";
    }

    const invalidCost = costs.find(
      (cost) =>
        cost.paymentMode === "PAID_BY_ONE" && !cost.paidByMemberId,
    );
    if (invalidCost) {
      return "Choose who paid for each cost marked as one member paid.";
    }

    if (costs.some((cost) => cost.participantMemberIds.length === 0)) {
      return "Choose at least one member in Shared with for each cost.";
    }

    return "";
  }

  async function saveBudgetEdit(itemOverride?: TripItem) {
    if (!tripId || !token || !budgetEditingItemId) return;
    const item =
      itemOverride ?? trip?.items?.find((candidate) => candidate.id === budgetEditingItemId);
    if (!item || !canEditTripItem(item)) return;

    const costs = budgetPayloadCosts();
    const validationMessage = validateBudgetPayloadCosts(costs);
    if (validationMessage) {
      setErr(validationMessage);
      return;
    }

    try {
      setSavingBudgetItemId(item.id);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ costs }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          errorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setBudgetModalOpen(false);
      setBudgetEditingItemId(null);
      setBudgetDrafts([]);
      setExpandedBudgetCostId(null);
      await loadTrip();
      await refreshCostViews();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save costs");
    } finally {
      setSavingBudgetItemId(null);
    }
  }

  function saveBudgetInline(item: TripItem, event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    void saveBudgetEdit(item);
  }

  function startTripEdit() {
    if (!trip) return;

    setErr(null);
    setEditingTrip(true);
    setTripDraft({
      title: trip.title || "",
      destination: trip.destination || "",
      description: trip.description || "",
    });
  }

  function updateEditDate(nextDate: string) {
    if (!editDraft) return;

    setEditDraft({
      ...editDraft,
      date: nextDate,
      endDate:
        editDraft.endDate && nextDate && editDraft.endDate < nextDate
          ? nextDate
          : editDraft.endDate,
    });
  }

  function updateEditEndDate(nextEndDate: string) {
    if (!editDraft) return;

    setEditDraft({
      ...editDraft,
      endDate:
        nextEndDate && editDraft.date && nextEndDate < editDraft.date
          ? editDraft.date
          : nextEndDate,
    });
  }

  function openDeleteTripConfirm() {
    if (!trip) return;

    setErr(null);
    setDeleteTripTitleInput("");
    setDeleteTripConfirmOpen(true);
  }

  function closeDeleteTripConfirm() {
    if (deletingTrip) return;

    setDeleteTripConfirmOpen(false);
    setDeleteTripTitleInput("");
  }

  async function openInviteSheet() {
    if (!tripId || !token || !canEditTrip) return;

    setInviteOpen(true);
    setInviteCopied(false);
    setInviteErr(null);

    try {
      setInviteBusy(true);
      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/invite`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      setInvite(await res.json());
      await loadActivity();
    } catch (e: any) {
      setInviteErr(e?.message ?? "Failed to load invite link");
    } finally {
      setInviteBusy(false);
    }
  }

  async function regenerateInvite() {
    if (!tripId || !token || !canEditTrip) return;

    try {
      setInviteBusy(true);
      setInviteCopied(false);
      setInviteErr(null);
      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/invite/regenerate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      setInvite(await res.json());
      await loadActivity();
    } catch (e: any) {
      setInviteErr(e?.message ?? "Failed to regenerate invite link");
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyInviteLink() {
    if (!invite) return;

    const link = `${window.location.origin}/trips/invite/${invite.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setInviteCopied(true);
    } catch {
      setInviteErr("Could not copy automatically. Select and copy the link.");
    }
  }

  async function shareInvite() {
    if (!invite) return;

    const inviteUrl = `${window.location.origin}/trips/invite/${invite.token}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Fairwayd trip invite",
          text: "Join my golf trip on Fairwayd",
          url: inviteUrl,
        });
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setInviteErr("Could not open share options. Copy the link instead.");
        }
      }
      return;
    }

    await copyInviteLink();
  }

  async function copySettlementSummary() {
    try {
      await navigator.clipboard.writeText(
        settlementSummaryText(trip, settlementSummary),
      );
      setSettlementCopied(true);
      window.setTimeout(() => setSettlementCopied(false), 1800);
    } catch {
      setSettlementCopied(false);
    }
  }

  async function shareSettlementSummary() {
    const text = settlementSummaryText(trip, settlementSummary);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Trip balances",
          text,
        });
        return;
      } catch {
        // Fall back to copying below.
      }
    }

    await copySettlementSummary();
  }

  async function saveTripEdit() {
    if (!tripId || !token || !tripDraft) return;

    if (!tripDraft.title.trim()) {
      setErr("Title is required.");
      return;
    }

    try {
      setSavingTrip(true);
      setErr(null);

      const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: tripDraft.title.trim(),
          destination: optionalText(tripDraft.destination),
          description: optionalText(tripDraft.description),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          tripErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setEditingTrip(false);
      setTripDraft(null);
      await loadTrip();
      await loadActivity();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save trip");
    } finally {
      setSavingTrip(false);
    }
  }

  async function deleteTrip() {
    if (!tripId || !token || !trip) return;
    if (deleteTripTitleInput !== trip.title) return;

    try {
      setDeletingTrip(true);
      setErr(null);

      const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          tripErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setDeleteTripConfirmOpen(false);
      setDeleteTripTitleInput("");
      nav("/trips");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete trip");
    } finally {
      setDeletingTrip(false);
    }
  }

  async function uploadCover(file?: File | null) {
    if (!tripId || !token || !file) return;

    try {
      setUploadingCover(true);
      setErr(null);

      const form = new FormData();
      form.append("cover", file);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/cover`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          tripErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      const updatedTrip = (await res.json().catch(() => null)) as Trip | null;
      const coverImageUrl =
        typeof updatedTrip?.coverImageUrl === "string"
          ? updatedTrip.coverImageUrl.trim()
          : "";

      if (!coverImageUrl) {
        throw new Error("Cover upload completed, but the API did not return coverImageUrl.");
      }

      const renderedCoverUrl = fileUrl(coverImageUrl);
      if (!renderedCoverUrl) {
        throw new Error("Cover upload returned an empty image URL.");
      }

      setTrip((current) => {
        const nextTrip = current
          ? { ...current, coverImageUrl }
          : updatedTrip
            ? { ...updatedTrip, coverImageUrl }
            : current;
        if (nextTrip && tripId) {
          const cachedAt = writeCachedTrip(tripId, nextTrip);
          setCachedTripAt(cachedAt);
        }
        return nextTrip;
      });
      setShowingCachedTrip(false);
      setRefreshTripMessage(null);
      await loadTrip();
      await loadActivity();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to upload trip cover");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function uploadTripDocument(params: {
    title: string;
    note?: string;
    category: TripDocumentCategory;
    visibility: TripDocumentVisibility;
    file: File;
  }) {
    if (!tripId || !token) throw new Error("Trip is not ready.");

    const form = new FormData();
    form.append("title", params.title);
    form.append("category", params.category);
    form.append("visibility", params.visibility);
    form.append("note", params.note?.trim() ?? "");
    form.append("file", params.file);

    const res = await fetch(
      `${API_BASE}/trips/${encodeURIComponent(tripId)}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        tripErrorMessageForResponse(
          res.status,
          `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
        ),
      );
    }

    const created = (await res.json()) as TripDocument;
    setDocuments((current) => [created, ...current]);
    return created;
  }

  async function uploadDocument() {
    if (!canUploadTripDocuments || uploadingDocument) return;

    const title = documentDraft.title.trim();
    if (!title) {
      setDocumentsErr("Document title is required.");
      return;
    }

    if (!documentDraft.file) {
      setDocumentsErr("Choose a PDF or image to upload.");
      return;
    }

    try {
      setUploadingDocument(true);
      setDocumentsErr(null);

      await uploadTripDocument({
        title,
        note: documentDraft.note,
        category: documentDraft.category,
        visibility: documentDraft.visibility,
        file: documentDraft.file,
      });
      setDocumentDraft({
        title: "",
        note: "",
        category: "GENERAL",
        visibility: "SHARED",
        file: null,
      });
      if (documentInputRef.current) documentInputRef.current.value = "";
      await loadActivity();
    } catch (e: any) {
      setDocumentsErr(e?.message ?? "Failed to upload document");
    } finally {
      setUploadingDocument(false);
    }
  }

  function documentCategoryForEditItem(): TripDocumentCategory {
    if (!editDraft) return "GENERAL";
    const type = String(editDraft.type ?? "").toLowerCase();
    if (type === "golf_round" || type === "course") return "GOLF";
    if (type === "hotel") return "HOTEL";
    if (type === "transfer" || type === "transport" || type === "car_rental") {
      return "TRANSFER";
    }
    if (type === "flight") return "FLIGHT";
    return "GENERAL";
  }

  function documentVisibilityForEditItem(): TripDocumentVisibility {
    return editDraft?.visibility === "PRIVATE" ? "PRIVATE" : "SHARED";
  }

  async function uploadAndLinkItemDocument(itemId: string) {
    if (!tripId || !token || !editDraft || !itemDocumentUploadFile) return;

    try {
      setItemDocumentUploadState("uploading");
      setItemDocumentUploadMessage("Uploading...");
      const created = await uploadTripDocument({
        title: itemDocumentUploadFile.name,
        note: "Uploaded from trip item",
        category: documentCategoryForEditItem(),
        visibility: documentVisibilityForEditItem(),
        file: itemDocumentUploadFile,
      });
      const nextDocumentIds = editDraft.documentIds.includes(created.id)
        ? editDraft.documentIds
        : [...editDraft.documentIds, created.id];

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentIds: nextDocumentIds }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          errorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setEditDraft({ ...editDraft, documentIds: nextDocumentIds });
      setItemDocumentUploadFile(null);
      setItemDocumentUploadState("uploaded");
      setItemDocumentUploadMessage("Uploaded and linked.");
      await loadTrip();
      await loadActivity();
    } catch (e: any) {
      setItemDocumentUploadState("failed");
      setItemDocumentUploadMessage(e?.message ?? "Upload failed.");
    }
  }

  async function deleteDocument(documentId: string) {
    if (!tripId || !token || deletingDocumentId) return;

    try {
      setDeletingDocumentId(documentId);
      setDocumentsErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/documents/${encodeURIComponent(documentId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          tripErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );
      await loadTrip();
      await loadActivity();
    } catch (e: any) {
      setDocumentsErr(e?.message ?? "Failed to delete document");
    } finally {
      setDeletingDocumentId(null);
    }
  }

  async function addMember() {
    if (!tripId || !token || !selectedUser) return;

    try {
      setAddingMember(true);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/members`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            role: newMemberRole,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          memberErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setMemberQuery("");
      setSelectedUser(null);
      setMemberResults([]);
      setNewMemberRole("MEMBER");
      await loadTrip();
      await loadActivity();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  }

  async function addGuestMember() {
    if (!tripId || !token || !guestName.trim()) return;

    try {
      setAddingMember(true);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/members`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            displayName: guestName.trim(),
            role: newMemberRole,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          memberErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setGuestName("");
      setNewMemberRole("MEMBER");
      await loadTrip();
      await loadActivity();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to add guest member");
    } finally {
      setAddingMember(false);
    }
  }

  async function updateMemberRole(memberId: string, role: TripRole) {
    if (!tripId || !token) return;

    try {
      setMemberBusyId(memberId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          memberErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update member");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function removeMember(memberId: string) {
    if (!tripId || !token) return;
    if (!window.confirm("Remove this member from the trip?")) return;

    try {
      setMemberBusyId(memberId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(memberId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          memberErrorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to remove member");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function saveEdit(itemId: string) {
    if (!tripId || !token || !editDraft) return;

    const isGolfEdit =
      editDraft.type === "golf_round" || editDraft.type === "course";
    const isFlightEdit = editDraft.type === "flight";
    const currentItem = trip?.items?.find((item) => item.id === itemId);
    const shouldSaveCosts =
      Boolean(currentItem) &&
      itemTypeSupportsCosts(editDraft.type) &&
      budgetEditingItemId === itemId;
    const costs = shouldSaveCosts ? budgetPayloadCosts() : undefined;
    const derivedGolfTitle =
      currentItem?.course?.name || editDraft.title.trim() || "Golf round";
    const normalizedEndDate =
      !isGolfEdit &&
      editDraft.endDate &&
      editDraft.date &&
      editDraft.endDate < editDraft.date
        ? editDraft.date
        : editDraft.endDate;

    if (
      !editDraft.type ||
      (!isGolfEdit && !isFlightEdit && !editDraft.title.trim()) ||
      !editDraft.date
    ) {
      setErr("Type, title, and date are required.");
      return;
    }

    if (costs) {
      const validationMessage = validateBudgetPayloadCosts(costs);
      if (validationMessage) {
        setErr(validationMessage);
        return;
      }
    }

    try {
      setSavingItemId(itemId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: editDraft.type,
            title: isGolfEdit
              ? derivedGolfTitle
              : isFlightEdit
                ? flightTitle(editDraft.title)
                : editDraft.title.trim(),
            date: editDraft.date,
            endDate: isGolfEdit ? undefined : optionalText(normalizedEndDate),
            startTime: editDraft.type === "hotel" ? "" : optionalText(editDraft.startTime),
            endTime: editDraft.type === "hotel" ? "" : optionalText(editDraft.endTime),
            provider: optionalText(editDraft.provider),
            bookingRef: isFlightEdit ? optionalText(editDraft.bookingRef) : undefined,
            notes: optionalText(editDraft.notes),
            locationName: optionalText(editDraft.locationName),
            address: optionalText(editDraft.address),
            visibility: editDraft.visibility,
            visibleToMemberIds:
              editDraft.visibility === "SELECTED"
                ? editDraft.visibleToMemberIds
                : undefined,
            documentIds: editDraft.documentIds,
            costs,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          errorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      setEditingItemId(null);
      setEditDraft(null);
      setBudgetEditingItemId(null);
      setBudgetDrafts([]);
      setExpandedBudgetCostId(null);
      setBudgetModalOpen(false);
      await loadTrip();
      await loadActivity();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save trip item");
    } finally {
      setSavingItemId(null);
    }
  }

  async function deleteItem(itemId: string) {
    if (!tripId || !token) return;
    if (!window.confirm("Delete this trip item?")) return;

    try {
      setDeletingItemId(itemId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          errorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      if (editingItemId === itemId) {
        setEditingItemId(null);
        setEditDraft(null);
      }

      await loadTrip();
      await loadActivity();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete trip item");
    } finally {
      setDeletingItemId(null);
    }
  }

  async function moveItem(itemId: string, direction: "up" | "down") {
    if (!tripId || !token) return;

    try {
      setMovingItemId(itemId);
      setErr(null);

      const res = await fetch(
        `${API_BASE}/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}/move`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ direction }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          errorMessageForResponse(
            res.status,
            `HTTP ${res.status} ${res.statusText} ${text}`.trim(),
          ),
        );
      }

      await loadTrip();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to move trip item");
    } finally {
      setMovingItemId(null);
    }
  }

  const groupedItems = useMemo(() => {
    const groups = new Map<string, TripItem[]>();

    for (const item of trip?.items ?? []) {
      const key = dateKey(item);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return Array.from(groups.entries());
  }, [trip?.items]);

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const groups = new Map<string, TripItem[]>();
    const itemOrder = new Map<string, number>();

    (trip?.items ?? []).forEach((item, index) => {
      itemOrder.set(item.id, index);
      for (const key of calendarItemDayKeys(item)) {
        groups.set(key, [...(groups.get(key) ?? []), item]);
      }
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => {
        const indicators: Record<CalendarIndicator, number> = {
          Golf: 0,
          Hotel: 0,
          Transfer: 0,
          "Car rental": 0,
          Flight: 0,
          Restaurant: 0,
          Other: 0,
        };

        const sortedItems = [...items].sort((a, b) => {
          const timeCompare = timeSortValue(a).localeCompare(timeSortValue(b));
          if (timeCompare !== 0) return timeCompare;
          return (itemOrder.get(a.id) ?? 0) - (itemOrder.get(b.id) ?? 0);
        });

        for (const item of sortedItems) {
          indicators[calendarIndicator(item.type)] += 1;
        }

        return {
          key,
          label: formatDateLabel(key),
          weekday: formatWeekdayLabel(key),
          items: sortedItems,
          indicators,
        };
      });
  }, [trip?.items]);

  useEffect(() => {
    if (calendarDays.length === 0) {
      if (selectedCalendarDay) setSelectedCalendarDay("");
      return;
    }

    if (!calendarDays.some((day) => day.key === selectedCalendarDay)) {
      setSelectedCalendarDay(calendarDays[0].key);
    }
  }, [calendarDays, selectedCalendarDay]);

  useEffect(() => {
    if (activeView !== "calendar") return;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, [activeView, selectedCalendarDay]);

  const mapMarkers = useMemo<TripMapMarker[]>(() => {
    return (trip?.items ?? [])
      .map((item): TripMapMarker | null => {
        const itemType = String(item.type ?? "").toLowerCase();
        const lat = toFiniteNumber(item.course?.lat ?? item.lat ?? item.latitude);
        const lon = toFiniteNumber(item.course?.lon ?? item.lon ?? item.longitude);
        const courseId = item.course?.id ?? item.courseId;
        const courseName = item.course?.name?.trim() || "";

        if (
          lat == null ||
          lon == null ||
          lat < -90 ||
          lat > 90 ||
          lon < -180 ||
          lon > 180
        ) {
          return null;
        }

        return {
          id: item.id,
          number: 0,
          title:
            item.title ||
            courseName ||
            item.locationName ||
            itemTypeLabel(item.type),
          typeLabel: itemTypeLabel(item.type),
          typeKey: itemType || "note",
          dateLabel: formatDateLabel(dateKey(item)),
          startTime: formatTime(item),
          timeLabel: formatTimeRange(item),
          courseId,
          courseName: courseName || null,
          locationName: item.locationName?.trim() || null,
          address: item.address?.trim() || null,
          lat,
          lon,
        };
      })
      .filter((marker): marker is TripMapMarker => marker !== null)
      .map((marker, index) => ({
        ...marker,
        number: index + 1,
      }));
  }, [trip?.items]);

  const summaryStats = useMemo<TripSummaryStat[]>(() => {
    const items = trip?.items ?? [];
    const dateTimes: number[] = [];
    let golfRounds = 0;
    let hotels = 0;
    let transfers = 0;

    for (const item of items) {
      const itemType = String(item.type ?? "").toLowerCase();
      if (itemType === "golf_round" || itemType === "course") golfRounds += 1;
      if (itemType === "hotel") hotels += 1;
      if (itemType === "transfer" || itemType === "transport") transfers += 1;

      for (const value of [itemDateValue(item), item.endDate]) {
        if (!value) continue;
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          const day = new Date(
            Date.UTC(
              date.getUTCFullYear(),
              date.getUTCMonth(),
              date.getUTCDate(),
            ),
          );
          dateTimes.push(day.getTime());
        }
      }
    }

    const tripDays =
      dateTimes.length === 0
        ? 0
        : Math.max(
            1,
            Math.round(
              (Math.max(...dateTimes) - Math.min(...dateTimes)) / 86400000,
            ) + 1,
          );

    return [
      { label: "Members", value: trip?.members?.length ?? 0 },
      { label: "Golf rounds", value: golfRounds },
      { label: "Hotels", value: hotels },
      { label: "Transfers", value: transfers },
      { label: "Trip days", value: tripDays },
    ];
  }, [trip?.items, trip?.members]);

  const budgetSummary = useMemo<BudgetSummary>(() => {
    const categories: Record<BudgetCategory, number> = {
      Golf: 0,
      Hotel: 0,
      Transfer: 0,
      Restaurant: 0,
      Activity: 0,
      Other: 0,
    };
    const currencies = new Set<string>();
    let greenTotal = 0;
    let directTotal = 0;
    let providerTotal = 0;
    let caddyTotal = 0;
    let cartTotal = 0;
    let sharedTotal = 0;
    let personalTotal = 0;

    for (const item of trip?.items ?? []) {
      if (isFlightItem(item)) continue;

      const itemTotal = itemBudgetAmount(item);
      const golf = isGolfItem(item);
      const green =
        golf && item.includeGreenFeeInSplit !== false
          ? finiteAmount(item.greenFee ?? item.directPrice)
          : 0;
      const direct = golf ? (item.greenFee ? finiteAmount(item.directPrice) : 0) : finiteAmount(item.directPrice);
      const provider =
        typeof item.providerPrice === "number" && Number.isFinite(item.providerPrice)
          ? item.providerPrice
          : 0;
      const caddy =
        !golf || item.includeCaddyFeeInSplit !== false
          ? finiteAmount(item.caddyFee)
          : 0;
      const cart =
        !golf || item.includeCartFeeInSplit !== false
          ? finiteAmount(item.cartFee)
          : 0;

      if (itemTotal > 0) {
        currencies.add(item.currency?.trim() || "CHF");
      }

      greenTotal += green;
      directTotal += direct;
      providerTotal += provider;
      caddyTotal += caddy;
      cartTotal += cart;
      categories[budgetCategory(item.type)] += itemTotal;
      if (item.expenseType === "PERSONAL") {
        personalTotal += itemTotal;
      } else {
        sharedTotal += itemTotal;
      }
    }

    const total = sharedTotal + personalTotal;
    const people = trip?.members?.length ?? 0;
    const currencyList = Array.from(currencies).sort();
    const currency = currencyList[0] || "CHF";

    return {
      mixedCurrencies: currencies.size > 1,
      currency,
      currencies: currencyList,
      total,
      sharedTotal,
      personalTotal,
      perPerson: people > 0 ? total / people : total,
      greenTotal,
      directTotal,
      providerTotal,
      caddyTotal,
      cartTotal,
      categories,
    };
  }, [trip?.items, trip?.members]);

  const baseCurrency = trip?.baseCurrency?.trim() || "CHF";
  function costSummaryDetailRows(
    mode: CostSummaryDrilldown["mode"],
    category: CostSummaryCategory,
  ): CostSummaryDetailRow[] {
    const currentMemberId = myMembership?.id;
    if (mode === "member" && !currentMemberId) return [];

    return (trip?.items ?? [])
      .flatMap((item) => {
        if (costSummaryCategory(item.type) !== category) return [];

        return (item.costs ?? []).flatMap((cost) => {
          const participantIds = costParticipantIds(cost, trip?.members ?? []);
          if (mode === "member" && !participantIds.includes(currentMemberId ?? "")) {
            return [];
          }

          const converted =
            mode === "member"
              ? memberCostShareInBaseCurrency(
                  cost,
                  baseCurrency,
                  participantIds.length,
                )
              : totalCostAmountInBaseCurrency(
                  cost,
                  baseCurrency,
                  participantIds.length,
                );
          const paidBy =
            cost.paidByMember ??
            (trip?.members ?? []).find((member) => member.id === cost.paidByMemberId);
          const participantNames =
            mode === "group"
              ? participantIds
                  .map((participantId) => {
                    const participant = cost.participants?.find(
                      (candidate) => candidate.tripMemberId === participantId,
                    );
                    return (
                      participant?.tripMember ??
                      (trip?.members ?? []).find((member) => member.id === participantId)
                    );
                  })
                  .filter((member): member is TripMember => Boolean(member))
                  .map(memberDisplayName)
              : [];
          const meta = [
            costModeText(cost.costMode),
            paidBy ? `paid by ${memberDisplayName(paidBy)}` : "",
            mode === "group" && participantNames.length > 0
              ? `${costSummaryParticipantLabel(category)}: ${participantNames.join(", ")}`
              : participantIds.length > 0
                ? `shared with ${participantIds.length} ${
                    participantIds.length === 1 ? "person" : "people"
                  }`
                : "",
          ].filter(Boolean);

          return [
            {
              id: `${item.id}-${cost.id}`,
              sortKey: `${dateKey(item)}-${timeSortValue(item)}-${cost.id}`,
              dateLabel: formatDateLabel(dateKey(item)),
              title: tripItemHeaderTitle(item),
              costLabel: budgetCostTitle(cost),
              amount: converted.missingExchangeRate ? 0 : converted.amount,
              amountText: converted.missingExchangeRate
                ? budgetCostAmountText(cost)
                : formatMoney(converted.amount, baseCurrency),
              missingExchangeRate: converted.missingExchangeRate,
              meta,
            },
          ];
        });
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }

  const activeCostSummaryRows = costSummaryDrilldown
    ? costSummaryDetailRows(
        costSummaryDrilldown.mode,
        costSummaryDrilldown.category,
      )
    : [];
  const activeCostSummaryTotal = activeCostSummaryRows.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const activeCostSummaryMissingCount = activeCostSummaryRows.filter(
    (row) => row.missingExchangeRate,
  ).length;

  const settlementSummary = useMemo<SettlementSummary>(() => {
    const members = trip?.members ?? [];
    const rowsByMemberId = new Map<string, SettlementMember>();
    const rowsByCurrency = new Map<string, Map<string, SettlementMember>>();
    const currencies = new Set<string>();

    for (const member of members) {
      rowsByMemberId.set(member.id, {
        member,
        paid: 0,
        share: 0,
        balance: 0,
      });
    }

    for (const item of trip?.items ?? []) {
      const amount = settlementItemAmount(item);
      if (amount <= 0) continue;

      const currency = item.currency?.trim() || "CHF";
      currencies.add(currency);

      let currencyRows = rowsByCurrency.get(currency);
      if (!currencyRows) {
        currencyRows = new Map<string, SettlementMember>();
        for (const member of members) {
          currencyRows.set(member.id, {
            member,
            paid: 0,
            share: 0,
            balance: 0,
          });
        }
        rowsByCurrency.set(currency, currencyRows);
      }

      const participants = effectiveParticipants(item, members);
      if (participants.length > 0) {
        const share = amount / participants.length;
        for (const participant of participants) {
          const row = rowsByMemberId.get(participant.id);
          if (row) row.share += share;

          const currencyRow = currencyRows.get(participant.id);
          if (currencyRow) currencyRow.share += share;
        }
      }

      const payerId = item.paidByMemberId || item.paidByMember?.id;
      if (payerId) {
        const row = rowsByMemberId.get(payerId);
        if (row) row.paid += amount;

        const currencyRow = currencyRows.get(payerId);
        if (currencyRow) currencyRow.paid += amount;
      }
    }

    const rows = Array.from(rowsByMemberId.values()).map((row) => ({
      ...row,
      balance: row.paid - row.share,
    }));
    const currencySummaries = Array.from(rowsByCurrency.entries())
      .map(([currency, rowsForCurrency]) => {
        const currencyRows = Array.from(rowsForCurrency.values()).map((row) => ({
          ...row,
          balance: row.paid - row.share,
        }));

        return {
          currency,
          rows: currencyRows,
          totalOwes: currencyRows.reduce(
            (sum, row) => sum + (row.balance < 0 ? Math.abs(row.balance) : 0),
            0,
          ),
          totalGetsBack: currencyRows.reduce(
            (sum, row) => sum + (row.balance > 0 ? row.balance : 0),
            0,
          ),
        };
      })
      .sort((a, b) => a.currency.localeCompare(b.currency));
    const mixedCurrencies = currencies.size > 1;
    const debtors = rows
      .filter((row) => row.balance < -0.005)
      .map((row) => ({ member: row.member, amount: Math.abs(row.balance) }))
      .sort((a, b) => b.amount - a.amount);
    const creditors = rows
      .filter((row) => row.balance > 0.005)
      .map((row) => ({ member: row.member, amount: row.balance }))
      .sort((a, b) => b.amount - a.amount);
    const transfers: SettlementTransfer[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (
      !mixedCurrencies &&
      debtorIndex < debtors.length &&
      creditorIndex < creditors.length
    ) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0.005) {
        transfers.push({
          from: debtor.member,
          to: creditor.member,
          amount,
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount <= 0.005) debtorIndex += 1;
      if (creditor.amount <= 0.005) creditorIndex += 1;
    }

    const currency = Array.from(currencies)[0] || "CHF";

    return {
      mixedCurrencies,
      currency,
      rows,
      currencySummaries,
      transfers,
      totalPaid: rows.reduce((sum, row) => sum + row.paid, 0),
      totalShare: rows.reduce((sum, row) => sum + row.share, 0),
      totalOwes: rows.reduce(
        (sum, row) => sum + (row.balance < 0 ? Math.abs(row.balance) : 0),
        0,
      ),
      totalGetsBack: rows.reduce(
        (sum, row) => sum + (row.balance > 0 ? row.balance : 0),
        0,
      ),
    };
  }, [trip?.items, trip?.members]);

  const memberCount = trip?.members?.length ?? 0;
  const itemCount = trip?.items?.length ?? 0;
  const tripRange = tripDateRange(trip?.items);
  const todayKey = new Date().toISOString().slice(0, 10);
  const datedItems = [...(trip?.items ?? [])].sort((a, b) => {
    const dayCompare = dateKey(a).localeCompare(dateKey(b));
    if (dayCompare !== 0) return dayCompare;
    return timeSortValue(a).localeCompare(timeSortValue(b));
  });
  const upcomingItemEntries = datedItems
    .map((item, index) => {
      const nextKey =
        calendarItemDayKeys(item)
          .filter((key) => key >= todayKey)
          .sort()[0] ?? "";
      return { item, index, nextKey };
    })
    .filter((entry) => entry.nextKey)
    .sort((a, b) => {
      const dayCompare = a.nextKey.localeCompare(b.nextKey);
      if (dayCompare !== 0) return dayCompare;
      const timeCompare = timeSortValue(a.item).localeCompare(timeSortValue(b.item));
      if (timeCompare !== 0) return timeCompare;
      return a.index - b.index;
    });
  const todayItems = upcomingItemEntries
    .filter((entry) => entry.nextKey === todayKey)
    .map((entry) => entry.item);
  const futureItems = upcomingItemEntries
    .filter((entry) => entry.nextKey > todayKey)
    .slice(0, 3);
  const travelEssentialsItems =
    todayItems.length > 0
      ? todayItems.map((item) => ({ item, displayKey: todayKey }))
      : futureItems.slice(0, 3).map((entry) => ({
          item: entry.item,
          displayKey: entry.nextKey,
        }));
  const upcomingTeeTimes = datedItems
    .filter((item) => {
      const key = dateKey(item);
      return (
        isGolfItem(item) &&
        key !== "unscheduled" &&
        key >= todayKey
      );
    })
    .slice(0, 3);
  const checklistReadyCount = defaultTravelChecklistItems.filter((item) =>
    checkedChecklistIds.has(item.id),
  ).length;
  const checklistTotal = defaultTravelChecklistItems.length;
  const budgetItems = (trip?.items ?? [])
    .map((item) => ({ item, amount: itemBudgetAmount(item) }))
    .filter(({ amount }) => amount > 0);
  const budgetFieldTotals = [
    { label: "Greenfee", value: budgetSummary.greenTotal },
    { label: "Direct", value: budgetSummary.directTotal },
    { label: "Provider", value: budgetSummary.providerTotal },
    { label: "Caddy", value: budgetSummary.caddyTotal },
    { label: "Cart", value: budgetSummary.cartTotal },
  ];
  const budgetCategoryTotals: { label: BudgetCategory; value: number }[] = [
    { label: "Golf", value: budgetSummary.categories.Golf },
    { label: "Hotel", value: budgetSummary.categories.Hotel },
    { label: "Transfer", value: budgetSummary.categories.Transfer },
    { label: "Restaurant", value: budgetSummary.categories.Restaurant },
    { label: "Activity", value: budgetSummary.categories.Activity },
    { label: "Other", value: budgetSummary.categories.Other },
  ];
  const budgetCards = [
    { label: "Total recorded costs", value: budgetSummary.total },
    { label: "Group/shared costs", value: budgetSummary.sharedTotal },
    { label: "Personal costs", value: budgetSummary.personalTotal },
  ];
  const filteredDocuments = useMemo(() => {
    if (documentCategoryFilter === "ALL") return documents;

    return documents.filter(
      (document) => document.category === documentCategoryFilter,
    );
  }, [documentCategoryFilter, documents]);
  const isRefreshingTrip = loading && !!trip;
  const atmosphereCoverUrl = trip?.coverImageUrl ? fileUrl(trip.coverImageUrl) : "";
  const detailsItem =
    trip?.items?.find((item) => item.id === detailsItemId) ?? null;
  const budgetEditingItem =
    trip?.items?.find((item) => item.id === budgetEditingItemId) ?? null;

  function renderMapActionLinks(item: TripItem, keyPrefix: string) {
    return tripItemMapActions(item).map((action) => (
      <a
        key={`${keyPrefix}-${action.label}`}
        className="fw-pill fw-pill--meta fw-pill--action"
        href={action.href}
        target="_blank"
        rel="noreferrer"
        style={{
          textDecoration: "none",
          whiteSpace: "nowrap",
          ...secondaryButtonStyle,
        }}
      >
        {action.label}
      </a>
    ));
  }

  function renderGolfRoundCompactCard(item: TripItem, key: string, displayKey?: string) {
    const accent = calendarItemAccent(item);
    const canEditCurrentItem = canEditTripItem(item);
    const returnLine = compactGolfReturnLine(item);
    const courseId = item.course?.id ?? item.courseId;

    return (
      <article
        key={key}
        style={{
          display: "grid",
          gap: 0,
          ...sectionInnerCardStyle,
          border: `1px solid ${accent.border}`,
          background: "color-mix(in srgb, var(--card) 96%, var(--bg))",
          boxShadow: "0 10px 24px rgba(0,0,0,0.1)",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <TripItemCardHeader
          item={item}
          displayKey={displayKey}
          onTitleClick={courseId ? () => nav(`/courses/${courseId}`) : undefined}
        />

        <div
          style={{
            padding: "10px 12px 11px",
            display: "grid",
            gap: 6,
            background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
          }}
        >
          <div
            style={{
              color: "var(--text)",
              fontSize: 13,
              lineHeight: 1.3,
              fontWeight: 900,
              overflowWrap: "anywhere",
            }}
          >
            {compactGolfTimingLine(item, displayKey) || "Tee time TBD"}
          </div>
          {returnLine ? (
            <div
              style={{
                color: "var(--sub)",
                fontSize: 13,
                lineHeight: 1.3,
                fontWeight: 850,
                overflowWrap: "anywhere",
              }}
            >
              {returnLine}
            </div>
          ) : null}
        </div>

        <div
          style={{
            ...wrappingActionRowStyle,
            gap: 6,
            padding: "0 12px 12px",
            background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
          }}
        >
          {renderMapActionLinks(item, key)}
          <button
            type="button"
            className="fw-pill fw-pill--meta"
            onClick={(event) => openItemDetails(item, event)}
            style={{
              cursor: "pointer",
              whiteSpace: "nowrap",
              ...secondaryButtonStyle,
            }}
          >
            Details
          </button>
          {canEditCurrentItem ? (
            <button
              type="button"
              className="fw-pill fw-pill--meta"
              onClick={(event) => openItemEdit(item, event)}
              style={{
                cursor: "pointer",
                whiteSpace: "nowrap",
                ...secondaryButtonStyle,
              }}
            >
              Edit
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <div className="fw-page">
      <div className="fw-page-atmosphere" aria-hidden="true">
        {atmosphereCoverUrl ? (
          <div
            className="fw-page-atmosphere-image"
            style={{
              backgroundImage: `url("${atmosphereCoverUrl}")`,
            }}
          />
        ) : null}
        <div className="fw-page-atmosphere-overlay" />
      </div>

      <div
        className="fw-page-shell"
        style={{
          overflowX: "hidden",
          overflowAnchor: activeView === "calendar" ? "none" : undefined,
          padding:
            activeView === "overview"
              ? "16px 16px calc(96px + env(safe-area-inset-bottom, 0px))"
              : activeView === "calendar"
                ? "10px 12px calc(112px + env(safe-area-inset-bottom, 0px))"
                : "4px 12px calc(112px + env(safe-area-inset-bottom, 0px))",
          display: "grid",
          gap: activeView === "overview" ? 16 : 8,
          alignContent: activeView === "calendar" ? "start" : undefined,
          alignItems: activeView === "calendar" ? "start" : undefined,
        }}
      >
      {showingCachedTrip ? (
        <div
          role="status"
          style={{
            ...safeSectionStyle,
            padding: "9px 11px",
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--sub)",
            fontSize: 12,
            fontWeight: 850,
            lineHeight: 1.35,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ minWidth: 0, flex: "1 1 190px", display: "grid", gap: 2 }}>
            <span style={{ color: "var(--text)", fontWeight: 950 }}>
              Saved travel data
            </span>
            <span>
              Last updated: {formatCachedAt(cachedTripAt)}
              {refreshTripMessage ? ` - ${refreshTripMessage}` : ""}
            </span>
          </span>
          <button
            type="button"
            onClick={loadTrip}
            disabled={loading}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor: loading ? "default" : "pointer",
              fontWeight: 900,
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            {isRefreshingTrip ? "Updating..." : "Refresh trip"}
          </button>
        </div>
      ) : null}

      {activeView === "overview" ? (
      <>
      <section
        style={{
          ...safeSectionStyle,
          overflow: "hidden",
          display: "grid",
          gap: 0,
          padding: 0,
          borderRadius: 28,
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 18px 46px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ position: "relative", minHeight: 118 }}>
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              height: 138,
              overflow: "hidden",
              background:
                "linear-gradient(135deg, var(--green), var(--muted))",
            }}
          >
            {trip?.coverImageUrl ? (
              <img
                src={fileUrl(trip.coverImageUrl)}
                alt={trip.title ? `${trip.title} cover` : "Trip cover"}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            ) : null}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.18))",
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => nav("/trips")}
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              height: 30,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.42)",
              background: "rgba(0,0,0,0.58)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12,
              backdropFilter: "blur(10px)",
              textShadow: "0 1px 6px rgba(0,0,0,0.55)",
            }}
          >
            Back to Trips
          </button>
        </div>

        <div
          style={{
            ...safeSectionStyle,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            padding: 12,
            marginTop: -54,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              minWidth: 0,
              width: "100%",
              maxWidth: "100%",
              display: "grid",
              gap: 4,
              flex: "1 1 240px",
            }}
          >
            {editingTrip && tripDraft ? (
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  value={tripDraft.title}
                  onChange={(e) =>
                    setTripDraft({ ...tripDraft, title: e.target.value })
                  }
                  placeholder="Trip title"
                  style={editFieldStyle}
                />
                <input
                  value={tripDraft.destination}
                  onChange={(e) =>
                    setTripDraft({
                      ...tripDraft,
                      destination: e.target.value,
                    })
                  }
                  placeholder="Destination"
                  style={editFieldStyle}
                />
                <textarea
                  value={tripDraft.description}
                  onChange={(e) =>
                    setTripDraft({
                      ...tripDraft,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description"
                  rows={3}
                  style={{ ...editFieldStyle, resize: "vertical" }}
                />
                <div style={wrappingActionRowStyle}>
                  <button
                    type="button"
                    onClick={saveTripEdit}
                    disabled={savingTrip}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      ...primaryButtonStyle,
                      cursor: savingTrip ? "default" : "pointer",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {savingTrip ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTrip(false);
                      setTripDraft(null);
                    }}
                    disabled={savingTrip}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      ...secondaryButtonStyle,
                      cursor: savingTrip ? "default" : "pointer",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 19,
                    lineHeight: 1.15,
                    fontWeight: 950,
                    color: "var(--text)",
                    textShadow: "0 2px 18px rgba(0,0,0,0.35)",
                  }}
                >
                  {trip?.title ?? "Trip"}
                </div>

                {trip?.destination ? (
                  <div style={{ fontSize: 13, color: "var(--sub)" }}>
                    {trip.destination}
                  </div>
                ) : null}

                {tripRange ? (
                  <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 900 }}>
                    {tripRange}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    color: "var(--sub)",
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  <span>{memberCount} members</span>
                  <span>{itemCount} items</span>
                </div>
              </>
            )}
          </div>

          {canEditTrip || canAddTripItems ? (
            <div style={{ ...wrappingActionRowStyle, opacity: 0.82 }}>
              {canEditTrip && !editingTrip ? (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadCover(e.target.files?.[0])}
                  style={{ display: "none" }}
                />
                <button
                  className="fw-button-secondary"
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={!trip || deletingTrip || uploadingCover}
                  style={{
                    height: 28,
                    padding: "0 9px",
                    borderRadius: 999,
                    cursor:
                      !trip || deletingTrip || uploadingCover
                        ? "default"
                        : "pointer",
                    fontWeight: 900,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {uploadingCover ? "Uploading..." : "Upload Cover"}
                </button>
                <button
                  className="fw-button-secondary"
                  type="button"
                  onClick={startTripEdit}
                  disabled={!trip || deletingTrip}
                  style={{
                    height: 28,
                    padding: "0 9px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    ...dangerButtonStyle,
                    cursor: !trip || deletingTrip ? "default" : "pointer",
                    fontWeight: 900,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    opacity: !trip || deletingTrip ? 0.55 : 1,
                  }}
                >
                  Edit Trip
                </button>
                <button
                  className="fw-button-primary"
                  type="button"
                  onClick={openInviteSheet}
                  disabled={!trip || deletingTrip || inviteBusy}
                  style={{
                    height: 28,
                    padding: "0 9px",
                    borderRadius: 999,
                    cursor:
                      !trip || deletingTrip || inviteBusy
                        ? "default"
                        : "pointer",
                    fontWeight: 900,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  Share / Invite
                </button>
                <button
                  className="fw-button-destructive"
                  type="button"
                  onClick={openDeleteTripConfirm}
                  disabled={!trip || deletingTrip}
                  style={{
                    height: 28,
                    padding: "0 9px",
                    borderRadius: 999,
                    cursor: !trip || deletingTrip ? "default" : "pointer",
                    fontWeight: 900,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {deletingTrip ? "Deleting..." : "Delete Trip"}
                </button>
              </>
            ) : null}
            {canAddTripItems ? (
            <button
              className="fw-button-primary"
              type="button"
              onClick={() => {
                if (tripId) nav(`/trips/${tripId}/add-item`);
              }}
              disabled={editingTrip || deletingTrip}
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 999,
                cursor: editingTrip || deletingTrip ? "default" : "pointer",
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              + Add Item
            </button>
            ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section
        ref={teeTimesSectionRef}
        id="upcoming-tee-times"
        style={{
          ...overviewAnchorStyle,
          ...safeSectionStyle,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <div style={sectionTitleTextStyle}>
            Upcoming tee times
          </div>
          <div style={sectionSubtitleTextStyle}>
            Next golf rounds on this trip
          </div>
        </div>

        {upcomingTeeTimes.length === 0 ? (
          <div
            style={{ padding: 12, color: "var(--sub)", fontSize: 13, lineHeight: 1.4, ...sectionMutedCardStyle }}
          >
            No upcoming tee times yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {upcomingTeeTimes.map((item) =>
              renderGolfRoundCompactCard(item, `tee-${item.id}`, dateKey(item)),
            )}
          </div>
        )}
      </section>

      <section
        id="travel-essentials"
        style={{
          ...overviewAnchorStyle,
          ...safeSectionStyle,
          display: "grid",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 2, minWidth: 0, flex: "1 1 190px" }}>
            <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 950 }}>
              {todayItems.length > 0 ? "Today" : "Next up"}
            </div>
            <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
              {isRefreshingTrip
                ? "Updating trip data..."
                : refreshTripMessage ??
                  (travelEssentialsItems.length > 0
                    ? "Travel essentials for the next scheduled stop"
                    : "Add dated items to see daily travel essentials")}
            </div>
          </div>
          <button
            type="button"
            onClick={loadTrip}
            disabled={loading}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              cursor: loading ? "default" : "pointer",
              fontWeight: 900,
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            {isRefreshingTrip ? "Updating..." : "Refresh trip"}
          </button>
        </div>

        {travelEssentialsItems.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {travelEssentialsItems.map(({ item, displayKey }) => {
              if (isGolfItem(item)) {
                return renderGolfRoundCompactCard(
                  item,
                  `essentials-${item.id}`,
                  displayKey,
                );
              }

              const routeOrLocation = compactItemWhereLine(item);
              const flightSummary = isFlightItem(item) ? flightSummaryLine(item) : "";
              const timingLine = isFlightItem(item)
                ? nextUpFlightTiming(item)
                : nextUpDateTimeLine(item, displayKey);
              const providerLine = item.provider?.trim() ?? "";
              const compactLines = isFlightItem(item)
                ? [timingLine, flightSummary]
                : isGolfItem(item)
                  ? [compactItemWhenLine(item, displayKey)]
                  : isHotelItem(item)
                    ? [compactItemWhenLine(item, displayKey), routeOrLocation]
                  : isNoteItem(item)
                    ? [compactNoteLine(item)]
                  : isTransportItem(item)
                    ? [timingLine, providerLine]
                    : [timingLine, routeOrLocation];
              const accent = calendarItemAccent(item);

              return (
                <article
                  key={`essentials-${item.id}`}
                  style={{
                    display: "grid",
                    gap: 0,
                    ...sectionInnerCardStyle,
                    border: `1px solid ${accent.border}`,
                    background: "color-mix(in srgb, var(--card) 96%, var(--bg))",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.1)",
                    overflow: "hidden",
                    minWidth: 0,
                  }}
                >
                  <TripItemCardHeader item={item} displayKey={displayKey} />

                  {compactLines.some(Boolean) ? (
                    <div
                      style={{
                        padding: "10px 12px 11px",
                        display: "grid",
                        gap: 7,
                        background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
                      }}
                    >
                      {compactLines.filter(Boolean).map((line) => (
                        <div
                          key={line}
                          style={{
                            color: "var(--text)",
                            fontSize: 13,
                            lineHeight: 1.25,
                            fontWeight: 900,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div
                    style={{
                      ...wrappingActionRowStyle,
                      gap: 6,
                      padding: "0 12px 12px",
                      background: "color-mix(in srgb, var(--card) 94%, var(--bg))",
                    }}
                  >
                    {renderMapActionLinks(item, `essentials-${item.id}`)}
                    <button
                      type="button"
                      className="fw-pill fw-pill--meta"
                      onClick={(event) => openItemDetails(item, event)}
                      style={{
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        ...secondaryButtonStyle,
                      }}
                    >
                      Details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section
        id="travel-tools"
        style={{ ...overviewAnchorStyle, ...sectionCardStyle }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <div style={sectionTitleTextStyle}>
            Travel tools
          </div>
          <div style={sectionSubtitleTextStyle}>
            Jump to the trip tools you will use on the road
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {[
            {
              icon: CalendarDays,
              title: "Calendar",
              subtitle: tripViewSubtitle("calendar"),
              action: () => openSubview("calendar"),
            },
            {
              icon: Route,
              title: "Timeline",
              subtitle: tripViewSubtitle("timeline"),
              action: () => setActiveView("timeline"),
            },
            {
              icon: MapPinned,
              title: "Map",
              subtitle: tripViewSubtitle("map"),
              action: () => setActiveView("map"),
            },
            {
              icon: WalletCards,
              title: "Budget",
              subtitle: tripViewSubtitle("budget"),
              action: () => setActiveView("budget"),
            },
            {
              icon: FileText,
              title: "Documents",
              subtitle: tripViewSubtitle("documents"),
              action: () => setActiveView("documents"),
            },
            {
              icon: CheckSquare,
              title: "Checklist",
              subtitle: "Local travel checklist",
              action: () => openOverviewSection(checklistSectionRef),
            },
          ].map((tool) => (
            <OverviewNavigationRow
              key={tool.title}
              icon={tool.icon}
              title={tool.title}
              subtitle={tool.subtitle}
              onClick={tool.action}
            />
          ))}
        </div>
      </section>

      {myMembership ? (
        <section
          style={{
            ...overviewAnchorStyle,
            ...sectionCardStyle,
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
              <div style={sectionTitleTextStyle}>My Costs</div>
              <div style={sectionSubtitleTextStyle}>
                Secure view of costs where you are involved
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refreshCostViews()}
              disabled={myCostsLoading}
              style={{
                minHeight: 32,
                padding: "0 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: 12,
                fontWeight: 900,
                cursor: myCostsLoading ? "default" : "pointer",
              }}
            >
              {myCostsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {myCostsErr ? (
            <div
              style={{
                color: "var(--danger)",
                fontSize: 12,
                lineHeight: 1.35,
                padding: "7px 9px",
                borderRadius: 12,
                background: "var(--danger-soft)",
                border: "1px solid color-mix(in srgb, var(--danger) 32%, var(--border))",
              }}
            >
              {myCostsErr}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {[
              {
                label: "My share",
                value: myCostsData?.summary.totalPersonalShare ?? 0,
              },
              {
                label: "Paid by me",
                value: myCostsData?.summary.totalPaidByMe ?? 0,
              },
              {
                label: "Balance",
                value: myCostsData?.summary.balancePreview ?? 0,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  minWidth: 0,
                  padding: "9px 10px",
                  borderRadius: 14,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  display: "grid",
                  gap: 2,
                }}
              >
                <span style={{ color: "var(--sub)", fontSize: 11, fontWeight: 900 }}>
                  {stat.label}
                </span>
                <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
                  {formatMoney(stat.value, myCostsData?.baseCurrency || baseCurrency)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 16,
                background: "color-mix(in srgb, var(--bg) 74%, var(--card))",
                border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                display: "grid",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
                    {myCostsBalancePreview > 0
                      ? `Others owe you ${formatMoney(myCostsBalancePreview, myCostsCurrency)}`
                      : myCostsBalancePreview < 0
                        ? `You owe ${formatMoney(Math.abs(myCostsBalancePreview), myCostsCurrency)}`
                        : "You are balanced."}
                  </div>
                  <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                    {myCostsBalancePreview !== 0
                      ? "This is your personal balance across costs where you are involved."
                      : "Your paid amounts and personal share currently cancel out."}
                  </div>
                </div>
                <div
                  style={{
                    color: "var(--text)",
                    fontSize: 14,
                    fontWeight: 950,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatMoney(Math.abs(myCostsBalancePreview), myCostsCurrency)}
                </div>
              </div>
            </div>

            {myCostsOwedToMe.length > 0 || myCostsIOwe.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  { title: "Who owes you", rows: myCostsOwedToMe },
                  { title: "You owe", rows: myCostsIOwe },
                ]
                  .filter((group) => group.rows.length > 0)
                  .map((group) => (
                    <div
                      key={group.title}
                      style={{
                        display: "grid",
                        gap: 6,
                        padding: "9px 10px",
                        borderRadius: 14,
                        background: "color-mix(in srgb, var(--bg) 72%, var(--card))",
                        border:
                          "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                      }}
                    >
                      <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
                        {group.title}
                      </div>
                      <div style={{ display: "grid", gap: 4 }}>
                        {group.rows.map((entry) => (
                          <div
                            key={entry.member.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                color: "var(--text)",
                                fontSize: 12,
                                fontWeight: 850,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {tripCostMemberDisplayName(entry.member)}
                            </span>
                            <span
                              style={{
                                color: "var(--text)",
                                fontSize: 12,
                                fontWeight: 950,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatMoney(entry.amount, myCostsCurrency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}

            {tripCostCategories.map((category) => {
              const rows = (myCostsData?.costs ?? []).filter(
                (row) => row.category === category,
              );
              if (rows.length === 0) return null;

              return (
                <div key={category} style={{ display: "grid", gap: 6 }}>
                  <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
                    {category}
                  </div>
                  {rows.map((row) => {
                    const isExpanded = expandedMyCostId === row.costId;
                    const isEachPaysOwn = row.paymentMode === "EACH_PAYS_OWN";
                    const shareSourceText = tripCostShareSourceText(row, myCostsCurrency);
                    const payerLabel =
                      row.paidByMemberId === myMembership?.id
                        ? "you"
                        : tripCostMemberDisplayName(row.paidBy);

                    return (
                      <div
                        key={row.costId}
                        style={{
                          display: "grid",
                          gap: 6,
                          padding: "9px 10px",
                          borderRadius: 14,
                          background: "color-mix(in srgb, var(--bg) 72%, var(--card))",
                          border:
                            "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMyCostId((current) =>
                              current === row.costId ? null : row.costId,
                            )
                          }
                          style={{
                            all: "unset",
                            cursor: "pointer",
                            display: "grid",
                            gap: 5,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                              <span
                                style={{
                                  color: "var(--text)",
                                  fontSize: 13,
                                  fontWeight: 950,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {row.tripItemTitle}
                              </span>
                              <span
                                style={{
                                  color: "var(--sub)",
                                  fontSize: 12,
                                  lineHeight: 1.3,
                                }}
                              >
                                {row.label}
                                {tripCostDateLabel(row) ? ` - ${tripCostDateLabel(row)}` : ""}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  color: "var(--text)",
                                  fontSize: 13,
                                  fontWeight: 950,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatMoney(row.personalShare, myCostsCurrency)}
                              </span>
                              <ChevronDown
                                size={16}
                                strokeWidth={2.4}
                                style={{
                                  color: "var(--sub)",
                                  transform: isExpanded ? "rotate(180deg)" : "none",
                                  transition: "transform 140ms ease",
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                            {isEachPaysOwn
                              ? `${shareSourceText} - everyone pays own part`
                              : `Paid by ${payerLabel} - shared with ${row.participantCount} ${
                                  row.participantCount === 1 ? "person" : "people"
                                }${
                                  row.netBalance !== 0
                                    ? ` - ${shareSourceText} - ${tripCostBalanceMessage(
                                        row,
                                        myCostsCurrency,
                                      )}`
                                    : ` - ${shareSourceText}`
                                }`}
                            {row.paymentMode === "EACH_PAYS_OWN" &&
                            row.costMode === "PER_PERSON" &&
                            row.participantCount > 1
                              ? " - Check cost mode"
                              : ""}
                          </div>
                        </button>

                        {row.paymentMode === "EACH_PAYS_OWN" &&
                        row.costMode === "PER_PERSON" &&
                        row.participantCount > 1 ? (
                          <div
                            style={{
                              color: "var(--danger)",
                              fontSize: 12,
                              lineHeight: 1.35,
                              fontWeight: 850,
                            }}
                          >
                            High per-person amount for a shared cost. Did you mean total amount?
                          </div>
                        ) : null}

                        {isExpanded ? (
                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                              paddingTop: 8,
                              borderTop:
                                "1px solid color-mix(in srgb, var(--border) 74%, transparent)",
                            }}
                          >
                            <div style={{ display: "grid", gap: 6 }}>
                              {[
                                ["What", row.tripItemTitle],
                                ["Type", row.tripItemType || row.category],
                                [
                                  "When",
                                  row.itemDate
                                    ? formatDateLabel(row.itemDate.slice(0, 10))
                                    : row.date
                                      ? formatDateLabel(row.date.slice(0, 10))
                                      : "",
                                ],
                                ["Where", tripCostDetailPlace(row)],
                                ["Total cost", formatMoney(row.totalBaseAmount, myCostsCurrency)],
                                [
                                  "Payment mode",
                                  tripCostPaymentModeText(row),
                                ],
                                [
                                  "Paid by",
                                  isEachPaysOwn
                                    ? ""
                                    : payerLabel === "you"
                                      ? "You"
                                      : payerLabel,
                                ],
                                ["My share", formatMoney(row.personalShare, myCostsCurrency)],
                                [
                                  "Paid by me",
                                  isEachPaysOwn
                                    ? ""
                                    : formatMoney(row.paidByMe, myCostsCurrency),
                                ],
                                [
                                  "Balance",
                                  isEachPaysOwn
                                    ? ""
                                    : row.netBalance > 0
                                    ? `+ ${formatMoney(row.netBalance, myCostsCurrency)}`
                                    : row.netBalance < 0
                                      ? `- ${formatMoney(Math.abs(row.netBalance), myCostsCurrency)}`
                                      : formatMoney(0, myCostsCurrency),
                                ],
                              ]
                                .filter(([, value]) => Boolean(value))
                                .map(([label, value]) => (
                                  <div
                                    key={String(label)}
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      justifyContent: "space-between",
                                      gap: 10,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "var(--sub)",
                                        fontSize: 12,
                                        fontWeight: 900,
                                      }}
                                    >
                                      {label}
                                    </span>
                                    <span
                                      style={{
                                        color: "var(--text)",
                                        fontSize: 12,
                                        fontWeight: 900,
                                        textAlign: "right",
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {value}
                                    </span>
                                  </div>
                                ))}
                            </div>

                            {row.participantShares.length > 0 ? (
                              <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ color: "var(--sub)", fontSize: 12, fontWeight: 900 }}>
                                  Participants
                                </div>
                                <div style={{ display: "grid", gap: 4 }}>
                                  {row.participantShares.map((entry) => (
                                    <div
                                      key={entry.member.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                      }}
                                    >
                                      <span
                                        style={{
                                          color: "var(--text)",
                                          fontSize: 12,
                                          fontWeight: 900,
                                        }}
                                      >
                                        {tripCostMemberDisplayName(entry.member)}
                                      </span>
                                      <span
                                        style={{
                                          color: "var(--text)",
                                          fontSize: 12,
                                          fontWeight: 900,
                                        }}
                                      >
                                        {formatMoney(entry.amount, myCostsCurrency)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {isEachPaysOwn ? (
                              <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                                Everyone pays own part
                              </div>
                            ) : null}

                            {row.owedToMe.length > 0 ? (
                              <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ color: "var(--sub)", fontSize: 12, fontWeight: 900 }}>
                                  Others owe you
                                </div>
                                <div style={{ display: "grid", gap: 4 }}>
                                  {row.owedToMe.map((entry) => (
                                    <div
                                      key={entry.member.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                      }}
                                    >
                                      <span
                                        style={{
                                          color: "var(--text)",
                                          fontSize: 12,
                                          fontWeight: 900,
                                        }}
                                      >
                                        {tripCostMemberDisplayName(entry.member)} owes you
                                      </span>
                                      <span
                                        style={{
                                          color: "var(--text)",
                                          fontSize: 12,
                                          fontWeight: 900,
                                        }}
                                      >
                                        {formatMoney(entry.amount, myCostsCurrency)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {row.iOwe.length > 0 ? (
                              <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ color: "var(--sub)", fontSize: 12, fontWeight: 900 }}>
                                  You owe
                                </div>
                                <div style={{ display: "grid", gap: 4 }}>
                                  {row.iOwe.map((entry) => (
                                    <div
                                      key={entry.member.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                      }}
                                    >
                                      <span
                                        style={{
                                          color: "var(--text)",
                                          fontSize: 12,
                                          fontWeight: 900,
                                        }}
                                      >
                                        You owe {tripCostMemberDisplayName(entry.member)}
                                      </span>
                                      <span
                                        style={{
                                          color: "var(--text)",
                                          fontSize: 12,
                                          fontWeight: 900,
                                        }}
                                      >
                                        {formatMoney(entry.amount, myCostsCurrency)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {!myCostsLoading && !myCostsErr && (myCostsData?.costs.length ?? 0) === 0 ? (
              <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.4 }}>
                No costs are assigned to you yet.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {canEditTrip ? (
        <section
          style={{
            ...overviewAnchorStyle,
            ...sectionCardStyle,
            gap: 10,
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <div style={sectionTitleTextStyle}>Trip Cost Sheet</div>
            <div style={sectionSubtitleTextStyle}>
              {organizerCostsLoading
                ? "Loading trip cost sheet..."
                : "Full cost overview for OWNER and ADMIN members"}
            </div>
          </div>

          {organizerCostsErr ? (
            <div
              style={{
                color: "var(--danger)",
                fontSize: 12,
                lineHeight: 1.35,
                padding: "7px 9px",
                borderRadius: 12,
                background: "var(--danger-soft)",
                border: "1px solid color-mix(in srgb, var(--danger) 32%, var(--border))",
              }}
            >
              {organizerCostsErr}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "9px 10px",
              borderRadius: 14,
              background: "var(--bg)",
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
              Total trip cost
            </span>
            <span
              style={{
                color: "var(--text)",
                fontSize: 14,
                fontWeight: 950,
                whiteSpace: "nowrap",
              }}
            >
              {formatMoney(
                organizerCostsData?.summary.totalTripCost ?? 0,
                organizerCostsData?.baseCurrency || baseCurrency,
              )}
            </span>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
              Paid by summary
            </div>
            {(organizerCostsData?.summary.paidBySummary ?? []).map((row) => (
              <div
                key={row.member.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--bg) 72%, var(--card))",
                  border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                }}
              >
                <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 900 }}>
                  {tripCostMemberDisplayName(row.member)}
                </span>
                <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
                  {formatMoney(row.totalPaid, organizerCostsData?.baseCurrency || baseCurrency)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
              Member balance summary
            </div>
            {(organizerCostsData?.summary.balancePreview ?? []).map((row) => (
              <div
                key={row.member.id}
                style={{
                  display: "grid",
                  gap: 7,
                  padding: "9px 10px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--bg) 72%, var(--card))",
                  border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                    <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 900 }}>
                      {tripCostMemberDisplayName(row.member)}
                    </span>
                    <span
                      style={{
                      color: row.balance < 0 ? "var(--danger)" : "var(--text)",
                      fontSize: 12,
                      fontWeight: 950,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {organizerBalanceText(row.balance, organizerCostsCurrency)}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 6,
                  }}
                >
                  {[
                    ["Paid", row.paid],
                    ["Share", row.expectedShare],
                    ["Balance", Math.abs(row.balance)],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      style={{
                        minWidth: 0,
                        display: "grid",
                        gap: 2,
                        padding: "6px 7px",
                        borderRadius: 10,
                        background: "var(--bg)",
                        border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                      }}
                    >
                      <span style={{ color: "var(--sub)", fontSize: 10, fontWeight: 900 }}>
                        {label}
                      </span>
                      <span style={{ color: "var(--text)", fontSize: 11, fontWeight: 950 }}>
                        {formatMoney(Number(value), organizerCostsCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
              All trip costs
            </div>
            {(organizerCostsData?.costs ?? []).map((row) => {
              const isExpanded = expandedOrganizerCostId === row.costId;
              const perPersonShare = organizerCostPerPersonShare(row);
              const owedRows = organizerCostOwedRows(row);
              const paidByLabel =
                row.paymentMode === "EACH_PAYS_OWN"
                  ? "Everyone pays own part"
                  : tripCostMemberDisplayName(row.paidBy);
              const paymentSummary =
                row.paymentMode === "EACH_PAYS_OWN"
                  ? "everyone pays own part"
                  : `paid by ${paidByLabel}`;

              return (
                <div
                  key={row.costId}
                  style={{
                    display: "grid",
                    gap: 6,
                    padding: "9px 10px",
                    borderRadius: 12,
                    background: "color-mix(in srgb, var(--bg) 72%, var(--card))",
                    border:
                      "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOrganizerCostId((current) =>
                        current === row.costId ? null : row.costId,
                      )
                    }
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      display: "grid",
                      gap: 5,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                        <span
                          style={{
                            color: "var(--text)",
                            fontSize: 12,
                            fontWeight: 950,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {row.tripItemTitle}
                        </span>
                        <span style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.3 }}>
                          {row.label}
                          {tripCostDateLabel(row) ? ` - ${tripCostDateLabel(row)}` : ""}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text)",
                            fontSize: 12,
                            fontWeight: 950,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(row.totalBaseAmount, organizerCostsCurrency)}
                        </span>
                        <ChevronDown
                          size={16}
                          strokeWidth={2.4}
                          style={{
                            color: "var(--sub)",
                            transform: isExpanded ? "rotate(180deg)" : "none",
                            transition: "transform 140ms ease",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                      {row.category} - {paymentSummary} - shared with {row.participantCount}{" "}
                      {row.participantCount === 1 ? "person" : "people"} - each{" "}
                      {formatMoney(perPersonShare, organizerCostsCurrency)}
                    </div>
                  </button>

                  {isExpanded ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        paddingTop: 8,
                        borderTop:
                          "1px solid color-mix(in srgb, var(--border) 74%, transparent)",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        {[
                          ["Date", tripCostDateLabel(row)],
                          ["Category", row.category],
                          ["Total cost", formatMoney(row.totalBaseAmount, organizerCostsCurrency)],
                          ["Paid by", paidByLabel],
                          ["Payment mode", tripCostPaymentModeText(row)],
                          ["Shared with", `${row.participantCount} ${row.participantCount === 1 ? "person" : "people"}`],
                          ["Per-person share", formatMoney(perPersonShare, organizerCostsCurrency)],
                        ]
                          .filter(([, value]) => Boolean(value))
                          .map(([label, value]) => (
                            <div
                              key={String(label)}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 10,
                              }}
                            >
                              <span style={{ color: "var(--sub)", fontSize: 12, fontWeight: 900 }}>
                                {label}
                              </span>
                              <span
                                style={{
                                  color: "var(--text)",
                                  fontSize: 12,
                                  fontWeight: 900,
                                  textAlign: "right",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {value}
                              </span>
                            </div>
                          ))}
                      </div>

                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ color: "var(--sub)", fontSize: 12, fontWeight: 900 }}>
                          Participants
                        </div>
                        {row.participants.map((member) => (
                          <div
                            key={member.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 900 }}>
                              {tripCostMemberDisplayName(member)}
                            </span>
                            <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 900 }}>
                              {formatMoney(perPersonShare, organizerCostsCurrency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {row.paymentMode === "EACH_PAYS_OWN" ? (
                        <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                          Everyone pays own part
                        </div>
                      ) : owedRows.length > 0 ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ color: "var(--sub)", fontSize: 12, fontWeight: 900 }}>
                            Who owes whom
                          </div>
                          {owedRows.map((entry) => (
                            <div
                              key={entry.member.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                              }}
                            >
                              <span
                                style={{
                                  color: "var(--text)",
                                  fontSize: 12,
                                  fontWeight: 900,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {tripCostMemberDisplayName(entry.member)} owes{" "}
                                {tripCostMemberDisplayName(entry.paidBy)}
                              </span>
                              <span
                                style={{
                                  color: "var(--text)",
                                  fontSize: 12,
                                  fontWeight: 950,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatMoney(entry.amount, organizerCostsCurrency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section
        ref={checklistSectionRef}
        id="before-you-go"
        style={{ ...overviewAnchorStyle, ...sectionCardStyle }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
            <div style={sectionTitleTextStyle}>
              Before you go
            </div>
            <div style={sectionSubtitleTextStyle}>
              Local travel checklist
            </div>
          </div>
          <div
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 950,
              whiteSpace: "nowrap",
            }}
          >
            {checklistReadyCount}/{checklistTotal} ready
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 8,
          }}
        >
          {defaultTravelChecklistItems.map((item) => {
            const checked = checkedChecklistIds.has(item.id);

            return (
              <label
                key={item.id}
                style={{
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  ...sectionMutedCardStyle,
                  color: checked ? "var(--sub)" : "var(--text)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 850,
                  lineHeight: 1.25,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleChecklistItem(item.id)}
                  style={{
                    width: 17,
                    height: 17,
                    margin: 0,
                    accentColor: "var(--text)",
                    flex: "0 0 auto",
                  }}
                />
                <span
                  style={{
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    fontSize: 13,
                    fontWeight: 850,
                    textDecoration: checked ? "line-through" : "none",
                  }}
                >
                  {item.label}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section
        style={{ ...sectionCardStyle, ...socialSectionCardStyle }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
            <div style={sectionTitleTextStyle}>
              Recent activity
            </div>
            <div style={sectionSubtitleTextStyle}>
              {activityLoading
                ? "Loading updates..."
                : "Latest shared trip updates"}
            </div>
          </div>
          <button
            type="button"
            onClick={loadActivity}
            disabled={activityLoading}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
              background: "transparent",
              color: "var(--sub)",
              cursor: activityLoading ? "default" : "pointer",
              fontWeight: 900,
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            Refresh
          </button>
        </div>

        {activityErr ? (
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background: "var(--danger-soft)",
              color: "var(--danger)",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {activityErr}
          </div>
        ) : null}

        {activity.length === 0 && !activityLoading ? (
          <div
            style={{
              padding: 14,
              borderRadius: 16,
              border: "1px dashed color-mix(in srgb, var(--border) 82%, transparent)",
              background: "color-mix(in srgb, var(--card) 84%, var(--bg))",
              color: "var(--sub)",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            No activity yet. Updates will appear here as your trip comes
            together.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {activity.slice(0, 6).map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px minmax(0, 1fr)",
                  gap: 10,
                  alignItems: "start",
                  padding: 9,
                  ...sectionMutedCardStyle,
                }}
              >
                {(() => {
                  const ActivityIcon = activityIcon(entry.type);
                  return (
                <div
                  aria-hidden="true"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 12,
                    border: "1px solid color-mix(in srgb, var(--border) 76%, transparent)",
                    background: "color-mix(in srgb, var(--card) 88%, var(--bg))",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <ActivityIcon size={16} strokeWidth={2.4} />
                </div>
                  );
                })()}
                <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <div style={{ ...compactLabelTextStyle, overflowWrap: "anywhere" }}>
                    {entry.message}
                  </div>
                  <div style={compactMetaTextStyle}>{formatActivityDate(entry.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </>
      ) : null}

      <div
        onTouchStart={handleSubviewTouchStart}
        onTouchEnd={handleSubviewTouchEnd}
        style={{
          display: "grid",
          gap: activeView === "overview" ? 16 : activeView === "calendar" ? 8 : 6,
          alignContent: activeView === "calendar" ? "start" : undefined,
          alignItems: activeView === "calendar" ? "start" : undefined,
          overflowAnchor: activeView === "calendar" ? "none" : undefined,
        }}
      >
        {activeView !== "overview" ? (
        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: activeView === "calendar" ? 8 : 10,
            padding: 0,
            minHeight: activeView === "calendar" ? 28 : 34,
          }}
        >
          <div style={{ minWidth: 0, display: "grid", gap: activeView === "calendar" ? 0 : 1 }}>
            <div
              style={{
                color: "var(--text)",
                fontSize: activeView === "calendar" ? 16 : 17,
                lineHeight: 1.1,
                fontWeight: 950,
              }}
            >
              {tripViewLabel(activeView)}
            </div>
            <div
              style={{
                color: "var(--sub)",
                fontSize: 11,
                lineHeight: activeView === "calendar" ? 1.05 : 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {trip?.title ?? "Trip"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveView("overview")}
            style={{
              flex: "0 0 auto",
              height: activeView === "calendar" ? 24 : 28,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--sub)",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            Back to trip
          </button>
        </section>
        ) : null}

      {activeView === "overview" ? (
      <>
      <section
        style={{
          ...safeSectionStyle,
          display: "grid",
          gap: 10,
          padding: 12,
          borderRadius: 26,
          background: "var(--card)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text)" }}>
            Trip Summary
          </div>
          <div style={{ fontSize: 12, color: "var(--sub)" }}>
            Key trip counts from the timeline
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
            gap: 8,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              style={{
                minWidth: 0,
                padding: "10px 10px",
                borderRadius: 22,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                display: "grid",
                gap: 3,
              }}
            >
              <div
                style={{
                  color: "var(--text)",
                  fontSize: 20,
                  lineHeight: 1,
                  fontWeight: 950,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  color: "var(--sub)",
                  fontSize: 11,
                  fontWeight: 900,
                  overflowWrap: "anywhere",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          ...safeSectionStyle,
          overflow: "hidden",
          display: "grid",
          gap: 12,
          padding: 14,
          borderRadius: 26,
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            ...safeSectionStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 180px" }}>
            <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text)" }}>
              Members
            </div>
            <div style={{ fontSize: 12, color: "var(--sub)" }}>
              People who can view this trip
            </div>
          </div>
          {canEditTrip ? (
            <div
              style={{
                color: "var(--sub)",
                fontSize: 12,
                fontWeight: 900,
                flex: "0 1 auto",
              }}
            >
              Admin tools
            </div>
          ) : null}
        </div>

        {canEditTrip ? (
          <div style={{ ...safeSectionStyle, display: "grid", gap: 8 }}>
            <div
              style={{
                ...safeSectionStyle,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <input
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  setSelectedUser(null);
                }}
                placeholder="Search Fairwayd user"
                style={{ ...editFieldStyle, flex: "1 1 180px", minWidth: 0 }}
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as TripRole)}
                style={{
                  ...editFieldStyle,
                  flex: "1 0 104px",
                  minWidth: 104,
                }}
              >
                {memberRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {selectedUser ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 22,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  fontSize: 13,
                  boxSizing: "border-box",
                  maxWidth: "100%",
                }}
              >
                <span
                  style={{
                    color: "var(--text)",
                    fontWeight: 900,
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    flex: "1 1 160px",
                  }}
                >
                  Selected: {displayUserName(selectedUser)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setMemberQuery("");
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--sub)",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  Clear
                </button>
              </div>
            ) : null}

            {memberResults.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  padding: 6,
                  borderRadius: 22,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  boxSizing: "border-box",
                  maxWidth: "100%",
                }}
              >
                {memberResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(result);
                      setMemberQuery(displayUserName(result));
                      setMemberResults([]);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 8px",
                      borderRadius: 20,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      cursor: "pointer",
                      textAlign: "left",
                      minWidth: 0,
                      boxSizing: "border-box",
                      maxWidth: "100%",
                    }}
                  >
                    <MemberAvatar user={result} />
                    <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                      <div style={{ fontWeight: 900 }}>
                        {displayUserName(result)}
                      </div>
                      {result.handle ? (
                        <div style={{ color: "var(--sub)", fontSize: 12 }}>
                          @{result.handle}
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            <div
              style={{
                ...safeSectionStyle,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={addMember}
                disabled={!selectedUser || addingMember}
                style={{
                  width: "fit-content",
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  cursor: !selectedUser || addingMember ? "default" : "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {addingMember ? "Adding..." : "Add Member"}
              </button>
            </div>

            <div
              style={{
                ...safeSectionStyle,
                display: "grid",
                gap: 6,
                paddingTop: 4,
              }}
            >
              <div style={{ color: "var(--sub)", fontSize: 12, fontWeight: 900 }}>
                Add guest manually
              </div>
              <div
                style={{
                  ...safeSectionStyle,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Guest name"
                  style={{ ...editFieldStyle, flex: "1 1 180px", minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={addGuestMember}
                  disabled={!guestName.trim() || addingMember}
                  style={{
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text)",
                    cursor:
                      !guestName.trim() || addingMember ? "default" : "pointer",
                    fontWeight: 900,
                    fontSize: 12,
                  }}
                >
                  {addingMember ? "Adding..." : "Add Guest"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ ...safeSectionStyle, display: "grid", gap: 8 }}>
          {(trip?.members ?? []).map((member) => {
            const memberUser = member.user;
            return (
              <div
                key={member.id}
                style={{
                  ...safeSectionStyle,
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: "7px 8px",
                  borderRadius: 22,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                <MemberAvatar
                  user={memberUser}
                  label={memberDisplayName(member)}
                />
                <div
                  style={{
                    minWidth: 0,
                    flex: "1 1 130px",
                    overflowWrap: "anywhere",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text)",
                      fontWeight: 900,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {memberDisplayName(member)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      alignItems: "center",
                      color: "var(--sub)",
                      fontSize: 12,
                    }}
                  >
                    {memberUser?.handle ? <span>@{memberUser.handle}</span> : null}
                    {member.isGuest ? (
                      <span
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 999,
                          padding: "2px 6px",
                          fontWeight: 900,
                        }}
                      >
                        Guest
                      </span>
                    ) : null}
                  </div>
                </div>

                {canEditTrip ? (
                  <select
                    value={member.role}
                    disabled={memberBusyId === member.id}
                    onChange={(e) =>
                      updateMemberRole(member.id, e.target.value as TripRole)
                    }
                    style={{
                      ...editFieldStyle,
                      width: "auto",
                      flex: "0 1 96px",
                      padding: "7px 8px",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {memberRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      padding: "5px 8px",
                      color: "var(--sub)",
                      fontSize: 11,
                      fontWeight: 900,
                      maxWidth: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {member.role}
                  </span>
                )}

                {canEditTrip ? (
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    disabled={memberBusyId === member.id}
                    style={{
                      height: 30,
                      padding: "0 10px",
                      flexShrink: 0,
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--sub)",
                      cursor:
                        memberBusyId === member.id ? "default" : "pointer",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {memberBusyId === member.id ? "..." : "Remove"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {loading && !trip ? (
        <TripCardsSkeleton count={2} />
      ) : null}

      {err ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      ) : null}

      </>
      ) : null}

      {activeView === "timeline" ? (
      <section style={{ display: "grid", gap: 10 }}>
        {!loading && !err && trip && groupedItems.length === 0 ? (
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: 16,
              borderRadius: 14,
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ color: "var(--text)", fontWeight: 950 }}>
              No timeline items yet
            </div>
            <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
              {canAddTripItems
                ? "Add the first round, hotel, transfer, or note to start building this trip."
                : "Trip admins have not added timeline items yet."}
            </div>
            {canAddTripItems ? (
              <button
                type="button"
                onClick={() => {
                  if (tripId) nav(addItemPath());
                }}
                style={{
                  width: "fit-content",
                  height: 34,
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
                + Add first item
              </button>
            ) : null}
          </div>
        ) : null}

        {groupedItems.map(([key, items]) => (
          <section
            key={key}
            style={{
              display: "grid",
              gap: 10,
              padding: "12px 0 2px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "0 2px",
              }}
            >
              <div
                style={{
                  color: "var(--text)",
                  fontSize: 13,
                  fontWeight: 950,
                }}
              >
                {formatDateLabel(key)}
              </div>
              {canEditTrip && key !== "unscheduled" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (tripId) nav(addItemPath(key));
                  }}
                  style={{
                    flex: "0 0 auto",
                    height: 26,
                    padding: "0 9px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  + Add item
                </button>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {items.map((item, itemIndex) => {
                const time = formatTimeRange(item);
                const dateRange = formatDateRange(item);
                const courseId = item.course?.id ?? item.courseId;
                const courseName = item.course?.name;
                const itemType = String(item.type ?? "").toLowerCase();
                const accent = calendarItemAccent(item);
                const isGolf =
                  itemType === "golf_round" || itemType === "course";
                const isFlight = isFlightItem(item);
                const canOpenCourse = isGolf && !!courseId;
                const isEditing = editingItemId === item.id && !!editDraft;
                const editIsGolf =
                  editDraft?.type === "golf_round" ||
                  editDraft?.type === "course";
                const editIsHotel = editDraft?.type === "hotel";
                const editIsFlight = editDraft?.type === "flight";
                const editIsTransferLike = isTransferType(editDraft?.type);
                const editIsNote = editDraft?.type === "note";
                const editSupportsCosts = itemTypeSupportsCosts(editDraft?.type);
                const isMoving = movingItemId === item.id;
                const canEditCurrentItem = canEditTripItem(item);
                const editVisibilityOptions = canEditTrip
                  ? tripItemVisibilityOptions
                  : memberTripItemVisibilityOptions;
                const canMoveUp =
                  canEditTrip && itemIndex > 0 && !isMoving;
                const canMoveDown =
                  canEditTrip &&
                  itemIndex < items.length - 1 &&
                  !isMoving;
                const compactWhen = compactItemWhenLine(item);
                const compactWhere = compactItemWhereLine(item);
                const flightSummary = isFlight ? flightSummaryLine(item) : "";
                const compactCostSummary = timelineCostSummaryText(
                  item,
                  trip?.members ?? [],
                  baseCurrency,
                );

                return (
                  <article
                    key={item.id}
                    id={tripItemDomId(item.id)}
                    style={
                      isEditing
                        ? {
                            scrollMarginTop: 84,
                            borderRadius: 16,
                            background: "var(--card)",
                            border: `1px solid ${accent.border}`,
                            display: "grid",
                            gap: 0,
                            overflow: "hidden",
                            boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
                          }
                        : {
                            scrollMarginTop: 84,
                            display: "grid",
                            gap: 0,
                            borderRadius: 16,
                            overflow: "hidden",
                            background:
                              "color-mix(in srgb, var(--card) 94%, var(--bg))",
                            border: `1px solid ${accent.border}`,
                            boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
                          }
                    }
                  >
                      <TripItemCardHeader
                        item={item}
                        onTitleClick={
                          canOpenCourse ? () => nav(`/courses/${courseId}`) : undefined
                        }
                      />

                      {isEditing ? (
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            padding: 14,
                            background:
                              "color-mix(in srgb, var(--card) 96%, var(--bg))",
                          }}
                        >
                          {courseName ? (
                            <div
                              style={{
                                color: "var(--sub)",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              Course stays linked: {courseName}
                            </div>
                          ) : null}

                          <section
                            style={{
                              display: "grid",
                              gap: 9,
                              padding: 10,
                              borderRadius: 14,
                              border: "1px solid var(--border)",
                              background: "color-mix(in srgb, var(--bg) 58%, var(--card))",
                            }}
                          >
                            <div style={{ display: "grid", gap: 2 }}>
                              <div
                                style={{
                                  color: "var(--text)",
                                  fontSize: 12,
                                  fontWeight: 950,
                                }}
                              >
                                Visibility
                              </div>
                              <div
                                style={{
                                  color: "var(--sub)",
                                  fontSize: 11,
                                  lineHeight: 1.35,
                                }}
                              >
                                Choose who can see this item. This is separate from cost sharing.
                              </div>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                              {editVisibilityOptions.map((option) => {
                                const selected = editDraft.visibility === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      const nextVisibleToMemberIds =
                                        option.value === "SELECTED" &&
                                        editDraft.visibleToMemberIds.length === 0 &&
                                        myMembership?.id
                                          ? [myMembership.id]
                                          : editDraft.visibleToMemberIds;
                                      setEditDraft({
                                        ...editDraft,
                                        visibility: option.value,
                                        visibleToMemberIds: nextVisibleToMemberIds,
                                      });
                                    }}
                                    style={{
                                      minHeight: 34,
                                      padding: "0 11px",
                                      borderRadius: 999,
                                      border: selected
                                        ? `1px solid ${accent.border}`
                                        : "1px solid var(--border)",
                                      background: selected
                                        ? accent.rail
                                        : "transparent",
                                      color: "var(--text)",
                                      cursor: "pointer",
                                      fontSize: 12,
                                      fontWeight: 900,
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>

                            {editDraft.visibility === "SELECTED" &&
                            (trip?.members ?? []).length > 0 ? (
                              <div style={{ display: "grid", gap: 7 }}>
                                <div
                                  style={{
                                    color: "var(--sub)",
                                    fontSize: 11,
                                    lineHeight: 1.35,
                                  }}
                                >
                                  These members can see this item.
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                                  {(trip?.members ?? []).map((member) => {
                                    const checked =
                                      editDraft.visibleToMemberIds.includes(
                                        member.id,
                                      );
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
                                          border: checked
                                            ? `1px solid ${accent.border}`
                                            : "1px solid var(--border)",
                                          background: checked ? accent.rail : "transparent",
                                          color: "var(--text)",
                                          fontSize: 12,
                                          fontWeight: 850,
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => {
                                            const nextIds = e.target.checked
                                              ? Array.from(
                                                  new Set([
                                                    ...editDraft.visibleToMemberIds,
                                                    member.id,
                                                  ]),
                                                )
                                              : editDraft.visibleToMemberIds.filter(
                                                  (id) => id !== member.id,
                                                );
                                            setEditDraft({
                                              ...editDraft,
                                              visibleToMemberIds: nextIds,
                                            });
                                          }}
                                        />
                                        <span>{memberDisplayName(member)}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </section>

                          <select
                            value={editDraft.type}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                type: e.target.value,
                              })
                            }
                            style={editFieldStyle}
                          >
                            {itemTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          {editIsGolf ? (
                            <div
                              style={{
                                padding: "9px 10px",
                                borderRadius: 10,
                                border: "1px solid var(--border)",
                                background: "var(--bg)",
                                color: "var(--sub)",
                                fontSize: 12,
                                fontWeight: 850,
                              }}
                            >
                              Title will be saved as{" "}
                              <span
                                style={{
                                  color: "var(--text)",
                                  fontWeight: 950,
                                }}
                              >
                                {courseName || editDraft.title || "Golf round"}
                              </span>
                            </div>
                          ) : editIsFlight ? (
                            <div style={{ display: "grid", gap: 10 }}>
                              <label
                                style={{
                                  display: "grid",
                                  gap: 6,
                                  color: "var(--text)",
                                  fontSize: 12,
                                  fontWeight: 900,
                                }}
                              >
                                Flight number
                                <input
                                  value={editDraft.title.replace(/^Flight\s+/i, "")}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      title: e.target.value,
                                    })
                                  }
                                  placeholder="TG971"
                                  style={editFieldStyle}
                                />
                              </label>
                              <label
                                style={{
                                  display: "grid",
                                  gap: 6,
                                  color: "var(--text)",
                                  fontSize: 12,
                                  fontWeight: 900,
                                }}
                              >
                                Airline
                                <input
                                  value={editDraft.provider}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      provider: e.target.value,
                                    })
                                  }
                                  placeholder="Thai Airways"
                                  style={editFieldStyle}
                                />
                              </label>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(140px, 1fr))",
                                  gap: 8,
                                }}
                              >
                                <label
                                  style={{
                                    display: "grid",
                                    gap: 6,
                                    color: "var(--text)",
                                    fontSize: 12,
                                    fontWeight: 900,
                                  }}
                                >
                                  From airport
                                  <input
                                    value={editDraft.locationName}
                                    onChange={(e) =>
                                      setEditDraft({
                                        ...editDraft,
                                        locationName: e.target.value,
                                      })
                                    }
                                    placeholder="ZRH"
                                    style={editFieldStyle}
                                  />
                                </label>
                                <label
                                  style={{
                                    display: "grid",
                                    gap: 6,
                                    color: "var(--text)",
                                    fontSize: 12,
                                    fontWeight: 900,
                                  }}
                                >
                                  To airport
                                  <input
                                    value={editDraft.address}
                                    onChange={(e) =>
                                      setEditDraft({
                                        ...editDraft,
                                        address: e.target.value,
                                      })
                                    }
                                    placeholder="BKK"
                                    style={editFieldStyle}
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <label
                              style={{
                                display: "grid",
                                gap: 6,
                                color: "var(--text)",
                                fontSize: 12,
                                fontWeight: 900,
                              }}
                            >
                              {editIsHotel ? "Hotel name" : "Title"}
                              <input
                                value={editDraft.title}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    title: e.target.value,
                                  })
                                }
                                placeholder={editIsHotel ? "Hotel name" : "Title"}
                                style={editFieldStyle}
                              />
                            </label>
                          )}

                          {!editIsFlight && !editIsNote ? (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(140px, 1fr))",
                                gap: 8,
                              }}
                            >
                              <label
                                style={{
                                  display: "grid",
                                  gap: 6,
                                  color: "var(--text)",
                                  fontSize: 12,
                                  fontWeight: 900,
                                }}
                              >
                                {editIsTransferLike ? "Pickup / From" : "Location"}
                                <input
                                  value={editDraft.locationName}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      locationName: e.target.value,
                                    })
                                  }
                                  placeholder={
                                    editIsTransferLike ? "BKK Airport" : "Location"
                                  }
                                  style={editFieldStyle}
                                />
                              </label>
                              <label
                                style={{
                                  display: "grid",
                                  gap: 6,
                                  color: "var(--text)",
                                  fontSize: 12,
                                  fontWeight: 900,
                                }}
                              >
                                {editIsTransferLike ? "Destination / To" : "Meeting point"}
                                <input
                                  value={editDraft.address}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      address: e.target.value,
                                    })
                                  }
                                  placeholder={
                                    editIsTransferLike ? "Areca Lodge" : "Optional"
                                  }
                                  style={editFieldStyle}
                                />
                              </label>
                            </div>
                          ) : null}

                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(140px, 1fr))",
                                gap: 8,
                              }}
                            >
                              <label
                                style={{
                                  display: "grid",
                                  gap: 6,
                                  color: "var(--text)",
                                  fontSize: 12,
                                  fontWeight: 900,
                                }}
                              >
                                {editIsFlight
                                  ? "Departure date"
                                  : editIsHotel
                                    ? "Check-in date"
                                    : "Date"}
                                <input
                                  type="date"
                                  value={editDraft.date}
                                  onChange={(e) => updateEditDate(e.target.value)}
                                  style={editFieldStyle}
                                />
                              </label>
                              {!editIsGolf ? (
                                <label
                                  style={{
                                    display: "grid",
                                    gap: 6,
                                    color: "var(--text)",
                                    fontSize: 12,
                                    fontWeight: 900,
                                  }}
                                >
                                  {editIsFlight ? "Arrival date" : "End date"}
                                  <input
                                    type="date"
                                    value={editDraft.endDate}
                                    min={editDraft.date || undefined}
                                    onChange={(e) => updateEditEndDate(e.target.value)}
                                    style={editFieldStyle}
                                  />
                                </label>
                              ) : null}
                            </div>
                            {!editIsHotel ? (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(140px, 1fr))",
                                  gap: 8,
                                }}
                              >
                                <label
                                  style={{
                                    display: "grid",
                                    gap: 6,
                                    color: "var(--text)",
                                    fontSize: 12,
                                    fontWeight: 900,
                                  }}
                                >
                                  {editIsFlight ? "Departure time" : "Start time"}
                                  <input
                                    type="time"
                                    value={editDraft.startTime}
                                    onChange={(e) =>
                                      setEditDraft({
                                        ...editDraft,
                                        startTime: e.target.value,
                                      })
                                    }
                                    style={editFieldStyle}
                                  />
                                </label>
                                <label
                                  style={{
                                    display: "grid",
                                    gap: 6,
                                    color: "var(--text)",
                                    fontSize: 12,
                                    fontWeight: 900,
                                  }}
                                >
                                  {editIsFlight ? "Arrival time" : "End time"}
                                  <input
                                    type="time"
                                    value={editDraft.endTime}
                                    onChange={(e) =>
                                      setEditDraft({
                                        ...editDraft,
                                        endTime: e.target.value,
                                      })
                                    }
                                    style={editFieldStyle}
                                  />
                                </label>
                              </div>
                            ) : null}
                            {editIsFlight || editIsHotel ? (
                              <div
                                style={{
                                  color: "var(--sub)",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                {editIsFlight
                                  ? "Arrival date is optional for overnight or connecting flights."
                                  : "End date is optional for multi-day stays."}
                              </div>
                            ) : null}
                          </div>

                          {!editIsFlight ? (
                          <label
                            style={{
                              display: "grid",
                              gap: 6,
                              color: "var(--text)",
                              fontSize: 12,
                              fontWeight: 900,
                            }}
                          >
                            {editIsGolf || editIsHotel
                              ? "Booked via / booked by"
                              : "Provider"}
                            <input
                              value={editDraft.provider}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  provider: e.target.value,
                                })
                              }
                              placeholder={
                                editIsGolf
                                  ? "Direct at golf course, Golfasian, Hotel concierge, Beda"
                                  : editIsHotel
                                    ? "Direct at hotel, Booking.com, Hotels.com, Agoda, Ebookers, Beda"
                                  : "Provider"
                              }
                              style={editFieldStyle}
                            />
                          </label>
                          ) : null}

                          {editIsFlight ? (
                            <label
                              style={{
                                display: "grid",
                                gap: 6,
                                color: "var(--text)",
                                fontSize: 12,
                                fontWeight: 900,
                              }}
                            >
                              Booking reference
                              <input
                                value={editDraft.bookingRef}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    bookingRef: e.target.value,
                                  })
                                }
                                placeholder="Booking reference"
                                style={editFieldStyle}
                              />
                            </label>
                          ) : null}

                          {editSupportsCosts ? (
                            <TripItemBudgetSection
                              item={{ ...item, type: editDraft.type, title: editDraft.title }}
                              members={trip?.members ?? []}
                              baseCurrency={baseCurrency}
                              canEdit={canEditCurrentItem}
                              drafts={
                                budgetEditingItemId === item.id
                                  ? budgetDrafts
                                  : budgetCostsForItem(item, trip?.members ?? []).map((cost) =>
                                      budgetDraftFromCost(cost, item),
                                    )
                              }
                              focusedDraftId={expandedBudgetCostId}
                              saving={savingBudgetItemId === item.id}
                              onStartInline={startBudgetInlineEdit}
                              onAddDraft={addBudgetDraftInline}
                              onUpdateDraft={updateBudgetDraft}
                              onDeleteDraft={deleteBudgetDraft}
                              onSave={saveBudgetInline}
                              onEdit={openBudgetEdit}
                            />
                          ) : null}

                          <div
                            style={{
                              display: "grid",
                              gap: 7,
                              padding: 10,
                              borderRadius: 14,
                              border: "1px solid var(--border)",
                              background: "color-mix(in srgb, var(--bg) 54%, var(--card))",
                            }}
                          >
                            <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
                              Related documents
                            </div>
                            {documents.length === 0 ? (
                              <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                                No documents yet. Upload a booking confirmation, voucher or screenshot.
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                                {documents.map((document) => {
                                  const selected = editDraft.documentIds.includes(document.id);
                                  return (
                                    <label
                                      key={document.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 7,
                                        minHeight: 34,
                                        maxWidth: "100%",
                                        padding: "0 10px",
                                        borderRadius: 999,
                                        border: selected
                                          ? "1px solid var(--accent-strong)"
                                          : "1px solid var(--border)",
                                        background: selected
                                          ? "var(--accent-soft)"
                                          : "transparent",
                                        color: "var(--text)",
                                        fontSize: 12,
                                        fontWeight: 850,
                                        overflow: "hidden",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={(event) =>
                                          setEditDraft({
                                            ...editDraft,
                                            documentIds: event.target.checked
                                              ? [...editDraft.documentIds, document.id]
                                              : editDraft.documentIds.filter(
                                                  (id) => id !== document.id,
                                                ),
                                          })
                                        }
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
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              onChange={(event) => {
                                setItemDocumentUploadFile(event.target.files?.[0] ?? null);
                                setItemDocumentUploadState("idle");
                                setItemDocumentUploadMessage("");
                              }}
                              style={{
                                ...editFieldStyle,
                                minHeight: 36,
                                fontSize: 12,
                                padding: "7px 10px",
                              }}
                            />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => uploadAndLinkItemDocument(item.id)}
                                disabled={
                                  !itemDocumentUploadFile ||
                                  itemDocumentUploadState === "uploading"
                                }
                                style={{
                                  height: 32,
                                  padding: "0 11px",
                                  borderRadius: 999,
                                  border: "1px solid var(--border)",
                                  background: "transparent",
                                  color: "var(--text)",
                                  cursor:
                                    !itemDocumentUploadFile ||
                                    itemDocumentUploadState === "uploading"
                                      ? "default"
                                      : "pointer",
                                  opacity:
                                    !itemDocumentUploadFile ||
                                    itemDocumentUploadState === "uploading"
                                      ? 0.65
                                      : 1,
                                  fontWeight: 900,
                                  fontSize: 12,
                                }}
                              >
                                {itemDocumentUploadState === "uploading"
                                  ? "Uploading..."
                                  : "Upload document"}
                              </button>
                              {itemDocumentUploadMessage ? (
                                <span
                                  style={{
                                    color:
                                      itemDocumentUploadState === "failed"
                                        ? "var(--danger)"
                                        : "var(--sub)",
                                    fontSize: 12,
                                    fontWeight: 800,
                                  }}
                                >
                                  {itemDocumentUploadMessage}
                                </span>
                              ) : null}
                            </div>
                            {editDraft.visibility === "SELECTED" ? (
                              <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                                Selected-item document visibility uses shared trip document visibility.
                              </div>
                            ) : null}
                          </div>

                          <textarea
                            value={editDraft.notes}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                notes: e.target.value,
                              })
                            }
                            placeholder={
                              editIsHotel
                                ? "Breakfast included/excluded, room type, cancellation details"
                                : "Notes"
                            }
                            rows={4}
                            style={{ ...editFieldStyle, resize: "vertical" }}
                          />

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => saveEdit(item.id)}
                              disabled={savingItemId === item.id}
                              style={{
                                height: 30,
                                padding: "0 12px",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                ...primaryButtonStyle,
                                cursor:
                                  savingItemId === item.id
                                    ? "default"
                                    : "pointer",
                                fontWeight: 900,
                                fontSize: 12,
                              }}
                            >
                              {savingItemId === item.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(null);
                                setEditDraft(null);
                                setBudgetEditingItemId(null);
                                setBudgetDrafts([]);
                                setExpandedBudgetCostId(null);
                                setBudgetModalOpen(false);
                              }}
                              disabled={savingItemId === item.id}
                              style={{
                                height: 30,
                                padding: "0 12px",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                ...secondaryButtonStyle,
                                cursor:
                                  savingItemId === item.id
                                    ? "default"
                                    : "pointer",
                                fontWeight: 900,
                                fontSize: 12,
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "grid",
                              gap: 9,
                              padding: 11,
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gap: 4,
                                color: "var(--text)",
                                fontSize: 13,
                                lineHeight: 1.3,
                                fontWeight: 900,
                              }}
                            >
                              {flightSummary ? (
                                <div>{flightSummary}</div>
                              ) : null}
                              <div>
                                {isFlight
                                  ? compactWhen || formatDateLabel(dateKey(item))
                                  : dateRange || compactWhen || formatDateLabel(dateKey(item))}
                                {!isGolf && !isFlight && time && !compactWhen ? ` · ${time}` : ""}
                              </div>
                              {!isFlight && compactWhere ? (
                                <div style={{ color: "var(--sub)" }}>{compactWhere}</div>
                              ) : null}
                            </div>

                            {compactCostSummary ? (
                              <div
                                style={{
                                  color: "var(--sub)",
                                  fontSize: 12,
                                  lineHeight: 1.3,
                                  fontWeight: 900,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {compactCostSummary}
                              </div>
                            ) : null}

                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                alignItems: "center",
                              }}
                            >
                              {canEditTrip ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => moveItem(item.id, "up")}
                                    disabled={!canMoveUp}
                                    className="fw-pill fw-pill--meta"
                                    style={{
                                      height: 30,
                                      cursor: canMoveUp ? "pointer" : "default",
                                      opacity: canMoveUp ? 1 : 0.45,
                                      ...secondaryButtonStyle,
                                    }}
                                  >
                                    Up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveItem(item.id, "down")}
                                    disabled={!canMoveDown}
                                    className="fw-pill fw-pill--meta"
                                    style={{
                                      height: 30,
                                      cursor: canMoveDown ? "pointer" : "default",
                                      opacity: canMoveDown ? 1 : 0.45,
                                      ...secondaryButtonStyle,
                                    }}
                                  >
                                    Down
                                  </button>
                                </>
                              ) : null}
                              {canOpenCourse ? (
                                <button
                                  type="button"
                                  onClick={() => nav(`/courses/${courseId}`)}
                                  className="fw-pill fw-pill--meta fw-pill--info"
                                  style={{
                                    height: 30,
                                    cursor: "pointer",
                                    ...secondaryButtonStyle,
                                  }}
                                >
                                  Open course
                                </button>
                              ) : null}
                              {renderMapActionLinks(item, `timeline-${item.id}`)}
                              <button
                                type="button"
                                onClick={(event) => openItemDetails(item, event)}
                                className="fw-pill fw-pill--meta fw-pill--action"
                                style={{
                                  height: 30,
                                  cursor: "pointer",
                                  ...secondaryButtonStyle,
                                }}
                              >
                                Details
                              </button>
                              {canEditCurrentItem ? (
                                <button
                                  type="button"
                                  onClick={(event) => openItemEdit(item, event)}
                                  disabled={deletingItemId === item.id}
                                  className="fw-pill fw-pill--meta"
                                  style={{
                                    height: 30,
                                    cursor:
                                      deletingItemId === item.id
                                        ? "default"
                                        : "pointer",
                                    ...secondaryButtonStyle,
                                  }}
                                >
                                  Edit
                                </button>
                              ) : null}
                              {canEditTrip ? (
                                <button
                                  type="button"
                                  onClick={() => deleteItem(item.id)}
                                  disabled={deletingItemId === item.id}
                                  className="fw-pill fw-pill--meta"
                                  style={{
                                    height: 30,
                                    cursor:
                                      deletingItemId === item.id
                                        ? "default"
                                        : "pointer",
                                    ...dangerButtonStyle,
                                  }}
                                >
                                  {deletingItemId === item.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              ) : null}
                            </div>
                          </div>

                        </>
                      )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>
      ) : activeView === "calendar" ? (
        <TripCalendarView
          days={calendarDays}
          items={trip?.items ?? []}
          members={trip?.members ?? []}
          baseCurrency={baseCurrency}
          selectedDay={selectedCalendarDay}
          onSelectDay={setSelectedCalendarDay}
          canEditTrip={canAddTripItems}
          onAddItem={(date) => {
            if (tripId) nav(addItemPath(date));
          }}
          canEditItem={canEditTripItem}
          onEditItem={openItemEdit}
          onOpenCourse={(courseId) => nav(`/courses/${courseId}`)}
          onOpenDetails={openItemDetails}
        />
      ) : activeView === "documents" ? (
        <section
          style={{
            ...safeSectionStyle,
            display: "grid",
            gap: 12,
          }}
        >
          {canUploadTripDocuments ? (
            <div
              style={{
                ...safeSectionStyle,
                display: "grid",
                gap: 10,
                padding: 14,
                borderRadius: 22,
                ...documentSectionCardStyle,
                boxShadow: "0 12px 34px rgba(0,0,0,0.16)",
              }}
            >
              <div style={{ display: "grid", gap: 2 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 950,
                    color: "var(--text)",
                  }}
                >
                  Add document
                </div>
                <div style={{ fontSize: 12, color: "var(--sub)" }}>
                  Shared notes, confirmations and travel files for this trip
                </div>
              </div>

              <input
                value={documentDraft.title}
                onChange={(event) =>
                  setDocumentDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Title"
                style={editFieldStyle}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 8,
                }}
              >
                <select
                  value={documentDraft.category}
                  onChange={(event) =>
                    setDocumentDraft((current) => ({
                      ...current,
                      category: event.target.value as TripDocumentCategory,
                    }))
                  }
                  style={editFieldStyle}
                >
                  {tripDocumentCategories.map((category) => (
                    <option key={category} value={category}>
                      {tripDocumentCategoryLabels[category]}
                    </option>
                  ))}
                </select>
                <input
                  ref={documentInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setDocumentDraft((current) => ({
                      ...current,
                      file: event.target.files?.[0] ?? null,
                    }))
                  }
                  style={{
                    ...editFieldStyle,
                    fontSize: 12,
                  }}
                />
              </div>

              <textarea
                value={documentDraft.note}
                onChange={(event) =>
                  setDocumentDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional note"
                rows={3}
                style={{ ...editFieldStyle, resize: "vertical" }}
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  color: "var(--text)",
                  fontSize: 13,
                  fontWeight: 850,
                  lineHeight: 1.35,
                }}
              >
                <input
                  type="checkbox"
                  checked={documentDraft.visibility === "PRIVATE"}
                  onChange={(event) =>
                    setDocumentDraft((current) => ({
                      ...current,
                      visibility: event.target.checked ? "PRIVATE" : "SHARED",
                    }))
                  }
                  style={{ width: 16, height: 16, flex: "0 0 auto" }}
                />
                <span>Private document - only visible to me</span>
              </label>

              <button
                type="button"
                onClick={uploadDocument}
                disabled={uploadingDocument}
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid var(--text)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  cursor: uploadingDocument ? "default" : "pointer",
                  fontWeight: 950,
                  fontSize: 13,
                }}
              >
                {uploadingDocument ? "Uploading..." : "Upload document"}
              </button>
            </div>
          ) : null}

          <div
            style={{
              ...safeSectionStyle,
              display: "grid",
              gap: 10,
              padding: 14,
              borderRadius: 22,
              ...documentSectionCardStyle,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 950,
                    color: "var(--text)",
                  }}
                >
                  Trip documents
                </div>
                <div style={{ fontSize: 12, color: "var(--sub)" }}>
                  {documentsLoading
                    ? "Loading documents..."
                    : `${documents.length} shared ${documents.length === 1 ? "file" : "files"}`}
                </div>
              </div>
              <button
                type="button"
                onClick={loadDocuments}
                disabled={documentsLoading}
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--sub)",
                  cursor: documentsLoading ? "default" : "pointer",
                  fontWeight: 900,
                  fontSize: 11,
                  whiteSpace: "nowrap",
                }}
              >
                Refresh
              </button>
            </div>

            {documentsErr ? (
              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {documentsErr}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 2,
              }}
              data-trip-swipe-ignore="true"
            >
              {(["ALL", ...tripDocumentCategories] as const).map((category) => {
                const active = documentCategoryFilter === category;
                const label =
                  category === "ALL"
                    ? "All"
                    : tripDocumentCategoryLabels[category];

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setDocumentCategoryFilter(category)}
                    style={{
                      flex: "0 0 auto",
                      height: 30,
                      padding: "0 11px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: active ? "var(--accent)" : "var(--bg)",
                      color: active ? "#f8fbf6" : "var(--sub)",
                      cursor: "pointer",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {documentsLoading && documents.length === 0 ? (
              <div style={{ color: "var(--sub)", fontSize: 13 }}>
                Loading documents...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  border: "1px dashed var(--border)",
                  color: "var(--sub)",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                No documents yet. Add confirmations, booking PDFs, passports or
                helpful trip notes here.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredDocuments.map((document) => {
                  const uploader =
                    document.uploadedBy?.name ||
                    document.uploadedBy?.handle ||
                    "Trip member";
                  const size = formatFileSize(document.sizeBytes);
                  const date = formatDocumentDate(document.createdAt);
                  const isPrivateDocument = document.visibility === "PRIVATE";
                  const isDocumentUploader =
                    document.uploadedByUserId === user?.id;
                  const canDeleteDocument = isPrivateDocument
                    ? isDocumentUploader
                    : canEditTrip || isDocumentUploader;

                  return (
                    <article
                      key={document.id}
                      style={{
                        display: "grid",
                        gap: 10,
                        padding: 12,
                        borderRadius: 18,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                width: "fit-content",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                padding: "4px 8px",
                                color: "var(--sub)",
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                            >
                              {tripDocumentCategoryLabels[document.category]}
                            </span>
                            {isPrivateDocument ? (
                              <span
                                style={{
                                  width: "fit-content",
                                  borderRadius: 999,
                                  border: "1px solid var(--border)",
                                  padding: "4px 8px",
                                  color: "var(--text)",
                                  background: "var(--card)",
                                  fontSize: 11,
                                  fontWeight: 950,
                                }}
                              >
                                Private
                              </span>
                            ) : null}
                          </div>
                          <div
                            style={{
                              color: "var(--text)",
                              fontSize: 15,
                              lineHeight: 1.2,
                              fontWeight: 950,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {document.title}
                          </div>
                        </div>
                      </div>

                      {document.note ? (
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: 13,
                            lineHeight: 1.45,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {document.note}
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: "grid",
                          gap: 3,
                          color: "var(--sub)",
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        <span style={{ overflowWrap: "anywhere" }}>
                          {document.fileName}
                          {size ? ` · ${size}` : ""}
                        </span>
                        <span>
                          Uploaded by {uploader}
                          {date ? ` · ${date}` : ""}
                        </span>
                      </div>

                      <div style={{ ...wrappingActionRowStyle, gap: 8 }}>
                        <a
                          href={fileUrl(document.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            height: 32,
                            padding: "0 11px",
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            background: "var(--text)",
                            color: "var(--bg)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textDecoration: "none",
                            fontWeight: 900,
                            fontSize: 12,
                          }}
                        >
                          Open file
                        </a>
                        {canDeleteDocument ? (
                          <button
                            type="button"
                            onClick={() => deleteDocument(document.id)}
                            disabled={deletingDocumentId === document.id}
                            style={{
                              height: 32,
                              padding: "0 11px",
                              borderRadius: 999,
                              border: "1px solid var(--border)",
                              ...dangerButtonStyle,
                              cursor:
                                deletingDocumentId === document.id
                                  ? "default"
                                  : "pointer",
                              fontWeight: 900,
                              fontSize: 12,
                              opacity: deletingDocumentId === document.id ? 0.55 : 1,
                            }}
                          >
                            {deletingDocumentId === document.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : activeView === "budget" ? (
        <section
          style={{
            ...safeSectionStyle,
            display: "grid",
            gap: 12,
            padding: 14,
            borderRadius: 22,
            ...financeSectionCardStyle,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              ...safeSectionStyle,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
              <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text)" }}>
                Budget Summary
              </div>
              <div style={{ fontSize: 12, color: "var(--sub)" }}>
                Secondary planning view for shared trip costs
              </div>
            </div>
            {budgetSummary.mixedCurrencies ? (
              <div
                style={{
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  color: "var(--sub)",
                  fontSize: 11,
                  fontWeight: 900,
                  padding: "5px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                Mixed currencies
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
              gap: 8,
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            {budgetCards.map((card) => (
              <div
                key={card.label}
                style={{
                  minWidth: 0,
                  padding: "12px 10px",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  display: "grid",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    color: "var(--text)",
                    fontSize: budgetSummary.mixedCurrencies && card.value > 0 ? 13 : 18,
                    lineHeight: 1.15,
                    fontWeight: 950,
                    overflowWrap: "anywhere",
                  }}
                >
                  {budgetAmount(card.value, budgetSummary)}
                </div>
                <div
                  style={{
                    color: "var(--sub)",
                    fontSize: 11,
                    fontWeight: 900,
                    overflowWrap: "anywhere",
                  }}
                >
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          {budgetSummary.mixedCurrencies ? (
            <div
              style={{
                padding: 12,
                color: "var(--sub)",
                fontSize: 12,
                lineHeight: 1.4,
                ...sectionMutedCardStyle,
              }}
            >
              Trip balances are disabled until exchange rates are available for all
              currencies.
            </div>
          ) : null}

          <div
            style={{
              ...sectionCardStyle,
              background: "var(--bg)",
              boxShadow: "none",
            }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <div style={sectionTitleTextStyle}>Cost list by item</div>
              <div style={sectionSubtitleTextStyle}>
                Recorded costs only. Who owes what is not calculated here.
              </div>
            </div>

            {budgetItems.length === 0 ? (
              <div
                style={{
                  padding: 10,
                  color: "var(--sub)",
                  fontSize: 12,
                  lineHeight: 1.35,
                  ...sectionMutedCardStyle,
                }}
              >
                No priced items yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {budgetItems.map(({ item, amount }) => {
                  const participants = effectiveParticipants(item, trip?.members ?? []);
                  const shared = item.expenseType !== "PERSONAL";
                  const payer = payerSummary(item) || "Not set";

                  return (
                    <div
                      key={`budget-${item.id}`}
                      style={{
                        display: "grid",
                        gap: 7,
                        padding: 10,
                        ...sectionMutedCardStyle,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: 13,
                            lineHeight: 1.25,
                            fontWeight: 900,
                            overflowWrap: "anywhere",
                            minWidth: 0,
                          }}
                        >
                          {tripItemTitle(item)}
                        </div>
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: 13,
                            lineHeight: 1.25,
                            fontWeight: 950,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(amount, item.currency)}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <span className="fw-pill fw-pill--meta">
                          Paid by {payer}
                        </span>
                        <span className="fw-pill fw-pill--meta">
                          {expenseTypeLabel(item)}
                        </span>
                        <span className="fw-pill fw-pill--meta">
                          {costModeLabel(item)}
                        </span>
                        {shared ? (
                          <span className="fw-pill fw-pill--meta">
                            {participants.length} participant
                            {participants.length === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {false ? (
          <>
          <div
            style={{
              ...safeSectionStyle,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {[
              ["Cost Sources", budgetFieldTotals],
              ["Category Breakdown", budgetCategoryTotals],
            ].map(([title, rows]) => (
              <div
                key={String(title)}
                style={{
                  minWidth: 0,
                  display: "grid",
                  gap: 7,
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
                  {String(title)}
                </div>
                {(rows as { label: string; value: number }[]).map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      color: "var(--sub)",
                      fontSize: 12,
                      fontWeight: 850,
                    }}
                  >
                    <span>{row.label}</span>
                    <span style={{ color: "var(--text)", textAlign: "right" }}>
                      {budgetAmount(row.value, budgetSummary)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div
            style={{
              ...sectionCardStyle,
              ...financeSectionCardStyle,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                <div style={sectionTitleTextStyle}>
                  Trip balances
                </div>
                <div style={sectionSubtitleTextStyle}>
                  Frontend estimate from paid-by, participants, and item costs
                </div>
              </div>
              <div style={{ ...wrappingActionRowStyle, width: "auto", gap: 7 }}>
                <button
                  type="button"
                  onClick={copySettlementSummary}
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {settlementCopied ? "Copied" : "Copy summary"}
                </button>
                <button
                  type="button"
                  onClick={shareSettlementSummary}
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  Share summary
                </button>
                {settlementSummary.mixedCurrencies ? (
                  <div
                    style={{
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      color: "var(--sub)",
                      fontSize: 11,
                      fontWeight: 900,
                      padding: "5px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Mixed currencies
                  </div>
                ) : null}
              </div>
            </div>

            {settlementSummary.mixedCurrencies ? (
              <div
                style={{ padding: 10, color: "var(--sub)", fontSize: 12, lineHeight: 1.35, ...sectionMutedCardStyle }}
              >
                Trip balances combine multiple currencies. Check source costs before
                deciding who owes what.
              </div>
            ) : null}

            {settlementSummary.mixedCurrencies ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={sectionSubtitleTextStyle}>
                  Per-currency balances
                </div>
                {settlementSummary.currencySummaries.map((summary) => {
                  const activeRows = summary.rows.filter(
                    (row) => Math.abs(row.balance) > 0.005,
                  );

                  return (
                    <div
                      key={summary.currency}
                      style={{ display: "grid", gap: 7, padding: 10, ...sectionMutedCardStyle }}
                    >
                      <div
                        style={{
                          color: "var(--text)",
                          fontSize: 12,
                          lineHeight: 1.25,
                          fontWeight: 900,
                        }}
                      >
                        {summary.currency}
                      </div>
                      {activeRows.length === 0 ? (
                        <div
                          style={{
                            color: "var(--sub)",
                            fontSize: 12,
                            lineHeight: 1.35,
                          }}
                        >
                          Everyone is even.
                        </div>
                      ) : (
                        activeRows.map((row) => (
                          <div
                            key={`${summary.currency}-${row.member.id}`}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              color: "var(--sub)",
                              fontSize: 11,
                              lineHeight: 1.25,
                              fontWeight: 800,
                            }}
                          >
                            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                              {memberDisplayName(row.member)}{" "}
                              {row.balance > 0 ? "gets back" : "owes"}
                            </span>
                            <span
                              style={{
                                color: "var(--text)",
                                textAlign: "right",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {settlementCurrencyAmount(row.balance, summary.currency)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                gap: 8,
              }}
            >
              {[
                ["Owes", settlementSummary.totalOwes],
                ["Gets back", settlementSummary.totalGetsBack],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  style={{ minWidth: 0, padding: "10px 9px", display: "grid", gap: 3, ...sectionMutedCardStyle }}
                >
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: settlementSummary.mixedCurrencies && Number(value) > 0 ? 12 : 14,
                      lineHeight: 1.15,
                      fontWeight: 950,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {settlementAmount(Number(value), settlementSummary)}
                  </div>
                  <div style={compactMetaTextStyle}>
                    {String(label)}
                  </div>
                </div>
              ))}
            </div>

            {settlementSummary.rows.length === 0 ? (
              <div
                style={{ padding: 12, color: "var(--sub)", fontSize: 13, lineHeight: 1.4, ...sectionMutedCardStyle }}
              >
                Add trip members and costs to see trip balances.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {settlementSummary.rows.map((row) => {
                  const balanceLabel =
                    row.balance > 0.005
                      ? "Gets back"
                      : row.balance < -0.005
                        ? "Owes"
                        : "Even";

                  return (
                    <div
                      key={row.member.id}
                      style={{ display: "grid", gap: 8, padding: 10, ...sectionMutedCardStyle }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: 13,
                            lineHeight: 1.2,
                            fontWeight: 850,
                            overflowWrap: "anywhere",
                            minWidth: 0,
                          }}
                        >
                          {memberDisplayName(row.member)}
                        </div>
                        <div
                          style={{
                            color: row.balance > 0.005 ? "var(--text)" : "var(--sub)",
                            fontSize: 11,
                            lineHeight: 1.25,
                            fontWeight: 850,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {balanceLabel === "Even"
                            ? "Even"
                            : `${balanceLabel} ${settlementAmount(row.balance, settlementSummary)}`}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 6,
                        }}
                      >
                        {[
                          ["Paid", row.paid],
                          ["Share", row.share],
                          ["Balance", row.balance],
                        ].map(([label, value]) => (
                          <div key={String(label)} style={{ minWidth: 0, display: "grid", gap: 2 }}>
                            <span style={compactMetaTextStyle}>
                              {String(label)}
                            </span>
                            <span
                              style={{
                                color: "var(--text)",
                                fontSize: settlementSummary.mixedCurrencies && Math.abs(Number(value)) > 0 ? 11 : 12,
                                lineHeight: 1.25,
                                fontWeight: 850,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {settlementAmount(Number(value), settlementSummary)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {settlementSummary.rows.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  paddingTop: 2,
                }}
              >
                <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
                  Suggested payments
                </div>

                {settlementSummary.mixedCurrencies ? (
                  <div
                    style={{ padding: 10, color: "var(--sub)", fontSize: 12, lineHeight: 1.35, ...sectionMutedCardStyle }}
                  >
                    Suggested payments are disabled for mixed currencies.
                  </div>
                ) : settlementSummary.transfers.length === 0 ? (
                  <div
                    style={{ padding: 10, color: "var(--sub)", fontSize: 12, lineHeight: 1.35, ...sectionMutedCardStyle }}
                  >
                    Everyone is even.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 7 }}>
                    {settlementSummary.transfers.map((transfer, index) => (
                      <div
                        key={`${transfer.from.id}-${transfer.to.id}-${index}`}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 10px", minWidth: 0, ...sectionMutedCardStyle }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            color: "var(--text)",
                            fontSize: 13,
                            fontWeight: 900,
                            lineHeight: 1.3,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {memberDisplayName(transfer.from)} pays{" "}
                          {memberDisplayName(transfer.to)}
                        </div>
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize:
                              settlementSummary.mixedCurrencies &&
                              transfer.amount > 0
                                ? 11
                                : 12,
                            fontWeight: 950,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {settlementAmount(transfer.amount, settlementSummary)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          </>
          ) : null}
        </section>
      ) : activeView === "map" ? (
        <TripMapView
          markers={mapMarkers}
          onOpenCourse={(courseId) => nav(`/courses/${courseId}`)}
        />
      ) : null}
      </div>

      {costSummaryDrilldown ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cost-summary-drilldown-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483000,
            background: "rgba(0,0,0,0.58)",
            display: "grid",
            placeItems: "end center",
            padding: "16px 12px max(24px, calc(16px + env(safe-area-inset-bottom, 0px)))",
            boxSizing: "border-box",
          }}
          onClick={() => setCostSummaryDrilldown(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
              overflowY: "auto",
              margin: "0 auto",
              display: "grid",
              gap: 12,
              padding: 16,
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--card, #ffffff)",
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
                <div
                  id="cost-summary-drilldown-title"
                  style={{ fontSize: 18, fontWeight: 950, lineHeight: 1.2 }}
                >
                  {costSummaryCategoryLabel(costSummaryDrilldown.category)}
                  {costSummaryDrilldown.mode === "group" ? " group costs" : " costs"}
                </div>
                <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                  {costSummaryDrilldown.mode === "group"
                    ? "Full group costs in the trip base currency."
                    : "Your share of costs where you are included."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCostSummaryDrilldown(null)}
                className="fw-pill fw-pill--meta"
                style={{
                  height: 30,
                  cursor: "pointer",
                  ...secondaryButtonStyle,
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {activeCostSummaryRows.length > 0 ? (
                activeCostSummaryRows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gap: 6,
                      padding: "9px 10px",
                      borderRadius: 14,
                      border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
                      background: "color-mix(in srgb, var(--bg) 68%, var(--card))",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <div style={compactMetaTextStyle}>{row.dateLabel}</div>
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: 13,
                            lineHeight: 1.25,
                            fontWeight: 950,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {row.title}
                        </div>
                        {row.costLabel && row.costLabel !== row.title ? (
                          <div
                            style={{
                              color: "var(--sub)",
                              fontSize: 12,
                              lineHeight: 1.25,
                              fontWeight: 850,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {row.costLabel}
                          </div>
                        ) : null}
                      </div>
                      <div
                        style={{
                          color: "var(--text)",
                          fontSize: 13,
                          lineHeight: 1.25,
                          fontWeight: 950,
                          whiteSpace: "nowrap",
                          flex: "0 0 auto",
                        }}
                      >
                        {row.amountText}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {row.meta.map((meta) => (
                        <span key={`${row.id}-${meta}`} className="fw-pill fw-pill--meta">
                          {meta}
                        </span>
                      ))}
                      {row.missingExchangeRate ? (
                        <span className="fw-pill fw-pill--meta">
                          exchange rate needed
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "color-mix(in srgb, var(--bg) 68%, var(--card))",
                    color: "var(--sub)",
                    fontSize: 12,
                    lineHeight: 1.35,
                  }}
                >
                  No costs in this category.
                </div>
              )}
            </div>

            {activeCostSummaryMissingCount > 0 ? (
              <div
                style={{
                  color: "var(--sub)",
                  fontSize: 12,
                  lineHeight: 1.35,
                  padding: "7px 9px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--warning) 10%, var(--card))",
                  border:
                    "1px solid color-mix(in srgb, var(--warning) 24%, var(--border))",
                }}
              >
                {activeCostSummaryMissingCount} foreign currency{" "}
                {activeCostSummaryMissingCount === 1 ? "cost needs" : "costs need"} an exchange rate
                and {activeCostSummaryMissingCount === 1 ? "is" : "are"} not included in the total.
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 14,
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
                Total
              </span>
              <span
                style={{
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 950,
                  whiteSpace: "nowrap",
                }}
              >
                {formatMoney(activeCostSummaryTotal, baseCurrency)}
              </span>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {detailsItem ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trip-item-details-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147482500,
            background: "rgba(15, 23, 42, 0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setDetailsItemId(null)}
        >
          <div
            className="fw-card"
            style={{
              width: "min(560px, 100%)",
              maxHeight: "min(720px, calc(100vh - 32px))",
              overflow: "auto",
              background: "var(--card)",
              color: "var(--text)",
              padding: 0,
              border: "1px solid var(--border)",
              boxShadow: "0 22px 70px rgba(0,0,0,0.36)",
              overflowClipMargin: "border-box",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "grid",
                gap: 0,
                borderRadius: "inherit",
                overflow: "hidden",
              }}
            >
              <div id="trip-item-details-title">
                <TripItemCardHeader item={detailsItem} />
              </div>

              <div style={{ display: "grid", gap: 12, padding: 16 }}>
              <section
                style={{
                  ...sectionMutedCardStyle,
                  display: "grid",
                  gap: 9,
                  padding: 12,
                }}
              >
                <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
                  Main info
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {compactItemWhereLine(detailsItem) ? (
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={compactMetaTextStyle}>Where / Route</div>
                      <div style={{ color: "var(--text)", fontSize: 14, fontWeight: 900, overflowWrap: "anywhere" }}>
                        {compactItemWhereLine(detailsItem)}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ display: "grid", gap: 2 }}>
                    <div style={compactMetaTextStyle}>Visibility</div>
                    <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 850, overflowWrap: "anywhere" }}>
                      {itemVisibilityText(detailsItem, trip?.members ?? [])}
                    </div>
                  </div>
                  {timelineDetails(detailsItem).map((detail) => (
                    <div key={`${detail.label}-${detail.value}`} style={{ display: "grid", gap: 2 }}>
                      <div style={compactMetaTextStyle}>{detail.label}</div>
                      <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 850, overflowWrap: "anywhere" }}>
                        {detail.value}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section
                style={{
                  ...sectionMutedCardStyle,
                  display: "grid",
                  gap: 8,
                  padding: 12,
                }}
              >
                <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
                  Timing
                </div>
                <div style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.35, fontWeight: 900, overflowWrap: "anywhere" }}>
                  {compactItemWhenLine(detailsItem) || "No timing set."}
                </div>
              </section>

              <TripItemBudgetSection
                item={detailsItem}
                members={trip?.members ?? []}
                baseCurrency={baseCurrency}
                canEdit={false}
                drafts={null}
                focusedDraftId={null}
                saving={false}
                onStartInline={startBudgetInlineEdit}
                onAddDraft={addBudgetDraftInline}
                onUpdateDraft={updateBudgetDraft}
                onDeleteDraft={deleteBudgetDraft}
                onSave={saveBudgetInline}
                onEdit={openBudgetEdit}
              />

              <section
                style={{
                  ...sectionMutedCardStyle,
                  display: "grid",
                  gap: 8,
                  padding: 12,
                }}
              >
                <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
                  Documents
                </div>
                {linkedDocumentsForItem(detailsItem, documents).length > 0 ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {linkedDocumentsForItem(detailsItem, documents).map((document) => (
                      <a
                        key={document.id}
                        href={fileUrl(document.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="fw-pill fw-pill--meta fw-pill--action"
                        style={{
                          minHeight: 36,
                          width: "fit-content",
                          maxWidth: "100%",
                          textDecoration: "none",
                          justifyContent: "flex-start",
                          overflowWrap: "anywhere",
                          ...secondaryButtonStyle,
                        }}
                      >
                        {document.title || document.fileName}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="fw-muted">No linked documents.</div>
                )}
              </section>

              <section
                style={{
                  ...sectionMutedCardStyle,
                  display: "grid",
                  gap: 8,
                  padding: 12,
                }}
              >
                <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 950 }}>
                  Notes
                </div>
                {detailsItem.notes?.trim() ? (
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text)",
                      fontSize: 13,
                      lineHeight: 1.45,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {detailsItem.notes.trim()}
                  </p>
                ) : (
                  <div className="fw-muted">No notes added.</div>
                )}
              </section>

              <div style={{ ...wrappingActionRowStyle, gap: 8, paddingTop: 2 }}>
                {tripItemMapActions(detailsItem).map((action) => (
                  <a
                    key={`details-${detailsItem.id}-${action.label}`}
                    className="fw-pill fw-pill--meta fw-pill--action"
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      minHeight: 38,
                      textDecoration: "none",
                      ...secondaryButtonStyle,
                    }}
                  >
                    {action.label}
                  </a>
                ))}
                {canEditTripItem(detailsItem) ? (
                  <button
                    type="button"
                    className="fw-pill fw-pill--meta fw-pill--action"
                    style={{
                      minHeight: 38,
                      cursor: "pointer",
                      ...secondaryButtonStyle,
                    }}
                    onClick={(event) => {
                      setDetailsItemId(null);
                      openItemEdit(detailsItem, event);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  className="fw-pill fw-pill--meta"
                  style={{
                    minHeight: 38,
                    cursor: "pointer",
                      ...secondaryButtonStyle,
                  }}
                  onClick={() => setDetailsItemId(null)}
                >
                  Close
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {budgetModalOpen && budgetEditingItem && trip ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="budget-edit-title"
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
          onClick={closeBudgetEdit}
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
                <div id="budget-edit-title" style={{ fontSize: 18, fontWeight: 950 }}>
                  Costs
                </div>
                <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.4 }}>
                  {tripItemTitle(budgetEditingItem)}
                </div>
              </div>
              <button
                type="button"
                onClick={closeBudgetEdit}
                disabled={Boolean(savingBudgetItemId)}
                className="fw-pill fw-pill--meta"
                style={{
                  height: 30,
                  cursor: savingBudgetItemId ? "default" : "pointer",
                  ...secondaryButtonStyle,
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {budgetDrafts.map((draft, index) => {
                const paidByRequired = draft.paymentMode === "PAID_BY_ONE";
                const isExpanded = expandedBudgetCostId === draft.localId;
                const draftAmount = optionalNumber(draft.amount);
                const draftPaidBy = (trip.members ?? []).find(
                  (member) => member.id === draft.paidByMemberId,
                );
                const participantCount = draft.participantMemberIds.length;
                const labelText = draft.label.trim() || `Cost ${index + 1}`;
                const amountText =
                  draftAmount !== undefined
                    ? formatMoney(draftAmount, draft.currency)
                    : "Amount not set";
                const paymentText =
                  draft.paymentMode === "EACH_PAYS_OWN"
                    ? "everyone pays own part"
                    : draftPaidBy
                      ? `paid by ${memberDisplayName(draftPaidBy)}`
                      : "paid by one member";
                const needsExchangeRate = draftNeedsExchangeRate(draft, baseCurrency);
                const shareHelperText = budgetDraftShareHelperText(draft);
                const splitPreview = budgetDraftPreviewText(draft);
                const costModeWarning = budgetDraftCostModeWarning(draft);
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
                            {labelText}
                          </div>
                          <div style={{ color: "var(--text)", fontSize: 12, fontWeight: 950 }}>
                            {amountText}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedBudgetCostId(isExpanded ? null : draft.localId)
                            }
                            className="fw-pill fw-pill--meta fw-pill--action"
                            style={{ height: 28, cursor: "pointer", ...secondaryButtonStyle }}
                          >
                            {isExpanded ? "Close" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBudgetDraft(draft.localId)}
                            className="fw-pill fw-pill--meta"
                            style={{ height: 28, cursor: "pointer", ...dangerButtonStyle }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        <span className="fw-pill fw-pill--meta">
                          {costModeText(draft.costMode)}
                        </span>
                        <span className="fw-pill fw-pill--meta">{paymentText}</span>
                        {participantCount > 0 ? (
                          <span className="fw-pill fw-pill--meta">
                            shared with {participantCount}{" "}
                            {participantCount === 1 ? "person" : "people"}
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
                        <label style={{ display: "grid", gap: 6, color: "var(--text)", fontSize: 12, fontWeight: 900 }}>
                          Label
                          <input
                            value={draft.label}
                            onChange={(event) =>
                              updateBudgetDraft(draft.localId, { label: event.target.value })
                            }
                            placeholder={costLabelPlaceholderForItemType(budgetEditingItem.type)}
                            style={editFieldStyle}
                          />
                        </label>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) minmax(92px, 120px)",
                            gap: 8,
                          }}
                        >
                          <label style={{ display: "grid", gap: 6, color: "var(--text)", fontSize: 12, fontWeight: 900 }}>
                            Amount
                            <input
                              type="number"
                              inputMode="decimal"
                              value={draft.amount}
                              onChange={(event) =>
                                updateBudgetDraft(draft.localId, { amount: event.target.value })
                              }
                              style={editFieldStyle}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6, color: "var(--text)", fontSize: 12, fontWeight: 900 }}>
                            Currency
                            <select
                              value={draft.currency}
                              onChange={(event) =>
                                updateBudgetDraft(draft.localId, { currency: event.target.value })
                              }
                              style={editFieldStyle}
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
                          {(["TOTAL", "PER_PERSON"] as CostMode[]).map((mode) => {
                            const option = {
                              value: mode,
                              label: costModeOptionLabel(mode),
                            };
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
                                  minHeight: 32,
                                  height: "auto",
                                  paddingTop: 7,
                                  paddingBottom: 7,
                                  cursor: "pointer",
                                  borderColor: selected ? "var(--accent-strong)" : "var(--border)",
                                  background: selected ? "var(--accent-soft)" : "transparent",
                                  color: selected ? "var(--text)" : "var(--sub)",
                                  whiteSpace: "normal",
                                  lineHeight: 1.2,
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ color: "var(--sub)", fontSize: 12, lineHeight: 1.35 }}>
                          {shareHelperText}
                        </div>
                        {splitPreview ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 7,
                            }}
                          >
                            <span className="fw-pill fw-pill--meta">
                              {splitPreview.eachPerson}
                            </span>
                            <span className="fw-pill fw-pill--meta">
                              {splitPreview.totalCost}
                            </span>
                          </div>
                        ) : null}
                        {costModeWarning ? (
                          <div
                            style={{
                              padding: "8px 9px",
                              borderRadius: 12,
                              border:
                                "1px solid color-mix(in srgb, var(--danger) 28%, var(--border))",
                              background:
                                "color-mix(in srgb, var(--danger) 9%, var(--card))",
                              color: "var(--danger)",
                              fontSize: 12,
                              lineHeight: 1.35,
                              fontWeight: 850,
                            }}
                          >
                            {costModeWarning}
                          </div>
                        ) : null}

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
                                  borderColor: selected ? "var(--accent-strong)" : "var(--border)",
                                  background: selected ? "var(--accent-soft)" : "transparent",
                                  color: selected ? "var(--text)" : "var(--sub)",
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>

                        {paidByRequired ? (
                          <label style={{ display: "grid", gap: 6, color: "var(--text)", fontSize: 12, fontWeight: 900 }}>
                            Paid by
                            <select
                              value={draft.paidByMemberId}
                              onChange={(event) =>
                                updateBudgetDraft(draft.localId, {
                                  paidByMemberId: event.target.value,
                                })
                              }
                              style={editFieldStyle}
                            >
                              <option value="">Choose member</option>
                              {(trip.members ?? []).map((member) => (
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
                            {(trip.members ?? []).map((member) => {
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
                                      ? "1px solid var(--accent-strong)"
                                      : "1px solid var(--border)",
                                    background: selected ? "var(--accent-soft)" : "transparent",
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
                {costLabelExamplesForItemType(budgetEditingItem.type).join(", ")}.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  onClick={addBudgetDraft}
                  className="fw-pill fw-pill--meta fw-pill--action"
                  style={{ height: 32, cursor: "pointer", ...secondaryButtonStyle }}
                >
                  Add cost
                </button>
                <button
                  type="button"
                  onClick={() => void saveBudgetEdit()}
                  disabled={Boolean(savingBudgetItemId)}
                  style={{
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    ...primaryButtonStyle,
                    cursor: savingBudgetItemId ? "default" : "pointer",
                    fontWeight: 900,
                    fontSize: 12,
                  }}
                >
                  {savingBudgetItemId ? "Saving..." : "Save costs"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {inviteOpen && trip ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trip-invite-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483000,
            background: "rgba(0,0,0,0.58)",
            display: "grid",
            alignItems: "end",
            padding: "16px 12px max(16px, env(safe-area-inset-bottom, 0px))",
            boxSizing: "border-box",
          }}
          onClick={() => {
            if (!inviteBusy) setInviteOpen(false);
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              margin: "0 auto",
              display: "grid",
              gap: 12,
              padding: 16,
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.38)",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <div id="trip-invite-title" style={{ fontSize: 18, fontWeight: 950 }}>
                Share {trip.title}
              </div>
              <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.4 }}>
                Anyone with this link can join as a read-only trip member.
              </div>
            </div>

            {inviteErr ? (
              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {inviteErr}
              </div>
            ) : null}

            <input
              readOnly
              value={
                invite
                  ? `${window.location.origin}/trips/invite/${invite.token}`
                  : inviteBusy
                    ? "Creating invite link..."
                    : ""
              }
              onFocus={(event) => event.currentTarget.select()}
              style={{
                ...editFieldStyle,
                background: "var(--bg)",
                fontSize: 12,
              }}
            />

            <div style={{ ...wrappingActionRowStyle, gap: 8 }}>
              <button
                type="button"
                onClick={shareInvite}
                disabled={!invite || inviteBusy}
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid var(--text)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  cursor: !invite || inviteBusy ? "default" : "pointer",
                  fontWeight: 950,
                  fontSize: 13,
                  flex: "1 1 150px",
                }}
              >
                Share invite
              </button>
              <button
                type="button"
                onClick={copyInviteLink}
                disabled={!invite || inviteBusy}
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--text)",
                  color: "var(--bg)",
                  cursor: !invite || inviteBusy ? "default" : "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {inviteCopied ? "Copied" : "Copy link"}
              </button>
              <button
                type="button"
                onClick={regenerateInvite}
                disabled={inviteBusy}
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--sub)",
                  cursor: inviteBusy ? "default" : "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {inviteBusy ? "Working..." : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                disabled={inviteBusy}
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--sub)",
                  cursor: inviteBusy ? "default" : "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {deleteTripConfirmOpen && trip ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-trip-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100dvh",
            zIndex: 2147483000,
            background: "rgba(0,0,0,0.58)",
            display: "grid",
            placeItems: "center",
            padding:
              "max(18px, env(safe-area-inset-top, 0px)) 14px max(18px, env(safe-area-inset-bottom, 0px))",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
          onClick={closeDeleteTripConfirm}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "calc(100dvh - 36px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
              overflowY: "auto",
              boxSizing: "border-box",
              display: "grid",
              gap: 14,
              padding: 16,
              borderRadius: 18,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.38)",
            }}
          >
            <div style={{ display: "grid", gap: 5 }}>
              <div
                id="delete-trip-title"
                style={{
                  fontSize: 18,
                  lineHeight: 1.2,
                  fontWeight: 950,
                  overflowWrap: "anywhere",
                }}
              >
                Delete {trip.title}
              </div>
              <div style={{ color: "var(--sub)", fontSize: 13, lineHeight: 1.45 }}>
                This permanently deletes the trip and everything connected to it.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 8,
                padding: 12,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 950 }}>Deleting removes:</div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  color: "var(--sub)",
                  lineHeight: 1.5,
                }}
              >
                <li>timeline items</li>
                <li>members</li>
                <li>calendar and map data</li>
                <li>budget data</li>
              </ul>
            </div>

            <label
              style={{
                display: "grid",
                gap: 7,
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              Type the exact trip title to confirm
              <input
                value={deleteTripTitleInput}
                onChange={(event) => setDeleteTripTitleInput(event.target.value)}
                placeholder={trip.title}
                style={editFieldStyle}
              />
            </label>

            <div style={wrappingActionRowStyle}>
              <button
                type="button"
                onClick={closeDeleteTripConfirm}
                disabled={deletingTrip}
                style={{
                  height: 36,
                  padding: "0 13px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  ...secondaryButtonStyle,
                  cursor: deletingTrip ? "default" : "pointer",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteTrip}
                disabled={deletingTrip || deleteTripTitleInput !== trip.title}
                style={{
                  height: 36,
                  padding: "0 13px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  ...dangerButtonStyle,
                  cursor:
                    deletingTrip || deleteTripTitleInput !== trip.title
                      ? "default"
                      : "pointer",
                  fontWeight: 950,
                  fontSize: 13,
                  opacity:
                    deletingTrip || deleteTripTitleInput !== trip.title ? 0.55 : 1,
                }}
              >
                {deletingTrip ? "Deleting..." : "Delete trip permanently"}
              </button>
            </div>
          </div>
        </div>
        ,
        document.body,
      ) : null}
      </div>
    </div>
  );
}

