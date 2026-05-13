import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { API_BASE } from "../api/base";
import { useAuth } from "../auth/AuthContext";
import { fileUrl } from "../api/fileUrl";

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
  provider?: string | null;
  bookingRef?: string | null;
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
  lat?: number | string | null;
  lon?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  courseId?: string | null;
  participants?: TripItemParticipant[];
  course?: {
    id: string;
    name?: string | null;
    lat?: number | string | null;
    lon?: number | string | null;
  } | null;
};

type Trip = {
  id: string;
  title: string;
  destination?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  members?: TripMember[];
  items?: TripItem[];
};

type TripRole = "OWNER" | "ADMIN" | "MEMBER";

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
  greenFee: string;
  caddyFee: string;
  cartFee: string;
  includeGreenFeeInSplit: boolean;
  includeCaddyFeeInSplit: boolean;
  includeCartFeeInSplit: boolean;
  directPrice: string;
  providerPrice: string;
  currency: string;
  locationName: string;
  address: string;
  bookingRef: string;
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

type BudgetCategory = "Golf" | "Hotel" | "Transfer" | "Activity" | "Other";

type BudgetSummary = {
  mixedCurrencies: boolean;
  currency: string;
  total: number;
  perPerson: number;
  greenTotal: number;
  directTotal: number;
  providerTotal: number;
  caddyTotal: number;
  cartTotal: number;
  categories: Record<BudgetCategory, number>;
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

type CalendarIndicator = "Golf" | "Hotel" | "Transfer" | "Flight" | "Other";

type CalendarSection = "Golf" | "Hotel" | "Transfers / Car" | "Flights" | "Other";

type CalendarDay = {
  key: string;
  label: string;
  weekday: string;
  items: TripItem[];
  indicators: Record<CalendarIndicator, number>;
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
  { value: "free_day", label: "Free day" },
  { value: "note", label: "Note" },
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

const subviewOrder: Exclude<TripView, "overview">[] = [
  "timeline",
  "calendar",
  "documents",
  "map",
  "budget",
];

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

  if (value === "golf_round" || value === "course") return "🏌";
  if (value === "hotel") return "🏨";
  if (value === "transfer") return "🚗";
  if (value === "car_rental") return "🚙";
  if (value === "free_day") return "🌴";
  return "📝";
}

function itemDateValue(item: TripItem) {
  return item.date ?? item.startsAt ?? null;
}

function itemTypeLabel(type?: string | null) {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer") return "Transfer";
  if (value === "car_rental") return "Car rental";
  if (value === "flight" || value === "flights") return "Flight";
  if (value === "free_day") return "Activity";
  return "Other";
}

function calendarIndicator(type?: string | null): CalendarIndicator {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer" || value === "car_rental") return "Transfer";
  if (value === "flight" || value === "flights") return "Flight";
  return "Other";
}

function calendarSection(type?: string | null): CalendarSection {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer" || value === "car_rental") return "Transfers / Car";
  if (value === "flight" || value === "flights") return "Flights";
  return "Other";
}

function budgetCategory(type?: string | null): BudgetCategory {
  const value = String(type ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") return "Golf";
  if (value === "hotel") return "Hotel";
  if (value === "transfer" || value === "car_rental") return "Transfer";
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

function dayKeyFromValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function dayKeysBetween(startKey: string, endKey: string) {
  const keys: string[] = [];
  if (!startKey) return keys;

  const start = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(`${endKey || startKey}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [startKey];
  }

  const last = end.getTime() < start.getTime() ? start : end;
  const cursor = new Date(start);

  while (cursor.getTime() <= last.getTime()) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
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

function activityIcon(type: TripActivityType) {
  if (type === "DOCUMENT_UPLOADED" || type === "DOCUMENT_DELETED") return "📄";
  if (
    type === "ITEM_CREATED" ||
    type === "ITEM_UPDATED" ||
    type === "ITEM_DELETED"
  ) {
    return "🧾";
  }
  if (type === "MEMBER_ADDED") return "👤";
  if (type === "INVITE_CREATED") return "🔗";
  return "✏️";
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

  if (start && end) return `${start} - ${end}`;
  return start || end;
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

function finiteAmount(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function pricingParts(item: TripItem) {
  if (isFlightItem(item)) return [];

  if (isGolfItem(item)) {
    const green = finiteAmount(item.greenFee ?? item.directPrice);
    const caddy = finiteAmount(item.caddyFee);
    const cart = finiteAmount(item.cartFee);

    return [
      green
        ? `Greenfee ${formatMoney(green, item.currency)}${
            item.includeGreenFeeInSplit === false ? " excluded" : ""
          }`
        : "",
      item.providerPrice
        ? `Provider ${formatMoney(item.providerPrice, item.currency)}`
        : "",
      caddy
        ? `Caddy ${formatMoney(caddy, item.currency)}${
            item.includeCaddyFeeInSplit === false ? " excluded" : ""
          }`
        : "",
      cart
        ? `Cart ${formatMoney(cart, item.currency)}${
            item.includeCartFeeInSplit === false ? " excluded" : ""
          }`
        : "",
      item.greenFee && item.directPrice
        ? `Other direct ${formatMoney(item.directPrice, item.currency)}`
        : "",
    ].filter(Boolean);
  }

  return [
    item.directPrice
      ? `Direct ${formatMoney(item.directPrice, item.currency)}`
      : "",
    item.providerPrice
      ? `Provider ${formatMoney(item.providerPrice, item.currency)}`
      : "",
    item.caddyFee ? `Caddy ${formatMoney(item.caddyFee, item.currency)}` : "",
    item.cartFee ? `Cart ${formatMoney(item.cartFee, item.currency)}` : "",
  ].filter(Boolean);
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

function previewLine(item: TripItem) {
  const type = String(item.type ?? "").toLowerCase();
  const time = formatTimeRange(item);
  const dateRange = formatDateRange(item);
  const courseName = item.course?.name?.trim();

  if (type === "flight" || type === "flights") {
    return [
      item.provider,
      item.locationName && item.address
        ? `${item.locationName} to ${item.address}`
        : item.locationName || item.address,
      time,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (type === "golf_round" || type === "course") {
    return [courseName, time ? `Tee ${time}` : ""].filter(Boolean).join(" · ");
  }

  if (type === "hotel") {
    return [item.locationName, dateRange || formatItemDate(itemDateValue(item))]
      .filter(Boolean)
      .join(" · ");
  }

  if (type === "transfer" || type === "car_rental") {
    return [time, item.locationName || item.address].filter(Boolean).join(" · ");
  }

  return [time, item.locationName].filter(Boolean).join(" · ");
}

function timelineDetails(item: TripItem) {
  const details: TimelineDetail[] = [];
  const isFlight = isFlightItem(item);

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

function amountValue(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

function effectiveParticipants(item: TripItem, members: TripMember[]) {
  if (item.participants && item.participants.length > 0) {
    return item.participants
      .map((participant) => participant.tripMember)
      .filter((member): member is TripMember => !!member);
  }

  return members;
}

function participantSummary(item: TripItem, members: TripMember[]) {
  const participants = effectiveParticipants(item, members);
  if (participants.length === 0) return "";
  if (participants.length === members.length && members.length > 0) {
    return `All members (${participants.length})`;
  }

  const names = participants.map(memberDisplayName);
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function payerSummary(item: TripItem) {
  if (!item.paidByMember) return "";
  return memberDisplayName(item.paidByMember);
}

function toFiniteNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function markerTypeStyles(typeKey: string) {
  const value = String(typeKey ?? "").toLowerCase();

  if (value === "golf_round" || value === "course") {
    return {
      background: "var(--text)",
      color: "var(--bg)",
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

  if (value === "transfer" || value === "car_rental") {
    return {
      background: "var(--bg)",
      color: "var(--text)",
      ring: "var(--sub)",
      glyph: "T",
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
  members,
  selectedDay,
  onSelectDay,
  canEditTrip,
  onAddItem,
  onOpenCourse,
}: {
  days: CalendarDay[];
  members: TripMember[];
  selectedDay: string;
  onSelectDay: (key: string) => void;
  canEditTrip: boolean;
  onAddItem: () => void;
  onOpenCourse: (courseId: string) => void;
}) {
  const selected = days.find((day) => day.key === selectedDay) ?? days[0];
  const calendarTodayKey = new Date().toISOString().slice(0, 10);
  const sections = useMemo(() => {
    const grouped = new Map<CalendarSection, TripItem[]>();
    const order: CalendarSection[] = [
      "Golf",
      "Hotel",
      "Transfers / Car",
      "Flights",
      "Other",
    ];

    for (const item of selected?.items ?? []) {
      const section = calendarSection(item.type);
      grouped.set(section, [...(grouped.get(section) ?? []), item]);
    }

    return order
      .map((section) => [section, grouped.get(section) ?? []] as const)
      .filter(([, items]) => items.length > 0);
  }, [selected]);

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
              onClick={onAddItem}
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
    <section style={{ display: "grid", gap: 6 }}>
      <div
        data-trip-swipe-ignore="true"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          overflowY: "visible",
          padding: "0 0 3px",
          maxWidth: "100%",
          boxSizing: "border-box",
          alignItems: "stretch",
        }}
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
                flex: "0 0 68px",
                width: 68,
                height: 76,
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
                  padding: "7px 6px",
                  borderRadius: 12,
                  overflow: "hidden",
                  "--fw-trip-calendar-day-bg": active
                    ? "#fff"
                    : "rgba(127,127,127,0.1)",
                  "--fw-trip-calendar-day-color": active
                    ? "#111827"
                    : "var(--text)",
                  background: active ? "#fff" : "rgba(127,127,127,0.1)",
                  backgroundClip: "padding-box",
                  color: active ? "#111827" : "var(--text)",
                  WebkitMaskImage: "-webkit-radial-gradient(white, black)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  boxSizing: "border-box",
                  boxShadow: active
                    ? "0 6px 14px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(17,24,39,0.12)"
                    : "inset 0 0 0 1px rgba(127,127,127,0.08)",
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

      <div
        style={{
          display: "grid",
          gap: 10,
          padding: 12,
          borderRadius: 18,
          overflow: "hidden",
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ color: "var(--sub)", fontSize: 11, fontWeight: 700 }}>
            {selected.weekday}
          </div>
          <div style={{ color: "var(--text)", fontSize: 16, fontWeight: 850 }}>
            {selected.label}
          </div>
        </div>

        {sections.map(([section, items]) => (
          <div key={section} style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 800,
                paddingTop: 4,
              }}
            >
              {section}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((item) => {
                const itemType = String(item.type ?? "").toLowerCase();
                const isGolf =
                  itemType === "golf_round" || itemType === "course";
                const isFlight = isFlightItem(item);
                const courseId = item.course?.id ?? item.courseId;
                const courseName = item.course?.name?.trim();
                const time = formatTimeRange(item);
                const prices = pricingParts(item);
                const participants = participantSummary(item, members);
                const payer = payerSummary(item);
                const title =
                  (isGolf && courseName) ||
                  item.title ||
                  item.locationName ||
                  itemTypeLabel(item.type);

                return (
                  <article
                    key={`${selected.key}-${item.id}-${section}`}
                    style={{
                      display: "grid",
                      gap: 7,
                      padding: 12,
                      borderRadius: 28,
                      overflow: "hidden",
                      border: "1px solid transparent",
                      background: "var(--bg)",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ minWidth: 0, display: "grid", gap: 3 }}>
                        <div
                          style={{
                            color: "var(--text)",
                            fontWeight: 850,
                            overflowWrap: "anywhere",
                            lineHeight: 1.25,
                          }}
                        >
                          {title}
                        </div>
                        {isGolf && courseName && item.title ? (
                          <div
                            style={{
                              color: "var(--sub)",
                              fontSize: 12,
                              fontWeight: 600,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.title}
                          </div>
                        ) : null}
                      </div>
                      {time ? (
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: 12,
                            fontWeight: 750,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {time}
                        </div>
                      ) : null}
                    </div>

                    {item.locationName || item.address ? (
                      <div style={{ display: "grid", gap: 3 }}>
                        {item.locationName ? (
                          <div style={{ color: "var(--sub)", fontSize: 12 }}>
                            {isFlight ? `From ${item.locationName}` : item.locationName}
                          </div>
                        ) : null}
                        {item.address ? (
                          <div style={{ color: "var(--sub)", fontSize: 12 }}>
                            {isFlight ? `To ${item.address}` : item.address}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {item.provider || item.bookingRef ? (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          color: "var(--sub)",
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        {item.provider ? <span>{item.provider}</span> : null}
                        {item.bookingRef ? (
                          <span>Booking {item.bookingRef}</span>
                        ) : null}
                      </div>
                    ) : null}

                    {participants ? (
                      <div
                        style={{
                          color: "var(--sub)",
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        Participants: {participants}
                      </div>
                    ) : null}

                    {payer ? (
                      <div
                        style={{
                          color: "var(--sub)",
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        Paid by {payer}
                      </div>
                    ) : null}

                    {prices.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          color: "var(--sub)",
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        {prices.map((price) => (
                          <span key={price}>{price}</span>
                        ))}
                      </div>
                    ) : null}

                    {item.notes ? (
                      <div
                        style={{
                          color: "var(--text)",
                          fontSize: 12,
                          lineHeight: 1.4,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.notes}
                      </div>
                    ) : null}

                    {isGolf && courseId ? (
                      <button
                        type="button"
                        onClick={() => onOpenCourse(courseId)}
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
  const { token, user } = useAuth();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<TripView>("overview");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [tripDraft, setTripDraft] = useState<TripEditDraft | null>(null);
  const [savingTrip, setSavingTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [deleteTripConfirmOpen, setDeleteTripConfirmOpen] = useState(false);
  const [deleteTripTitleInput, setDeleteTripTitleInput] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
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
  const [activity, setActivity] = useState<TripActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityErr, setActivityErr] = useState<string | null>(null);

  const myMembership = trip?.members?.find((member) => member.userId === user?.id);
  const canEditTrip =
    myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";
  const canUploadTripDocuments = Boolean(myMembership);

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

  async function loadTrip() {
    if (!token || !tripId) return;

    try {
      setLoading(true);
      setErr(null);

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
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`.trim());
      }

      const data = await res.json();
      setTrip(data);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load trip");
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tripId]);

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
    if (activeView !== "documents") return;

    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, token, tripId]);

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
    const participantMemberIds =
      item.participants && item.participants.length > 0
        ? item.participants.map((participant) => participant.tripMemberId)
        : (trip?.members ?? []).map((member) => member.id);
    setEditDraft({
      type: item.type || "note",
      title: item.title || "",
      date: dateInputValue(item),
      endDate: endDateInputValue(item),
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      provider: item.provider || "",
      notes: item.notes || "",
      greenFee: numberInputValue(item.greenFee ?? item.directPrice),
      caddyFee: numberInputValue(item.caddyFee),
      cartFee: numberInputValue(item.cartFee),
      includeGreenFeeInSplit: item.includeGreenFeeInSplit !== false,
      includeCaddyFeeInSplit: item.includeCaddyFeeInSplit !== false,
      includeCartFeeInSplit: item.includeCartFeeInSplit !== false,
      directPrice: numberInputValue(item.directPrice),
      providerPrice: numberInputValue(item.providerPrice),
      currency: item.currency || "CHF",
      locationName: item.locationName || "",
      address: item.address || "",
      bookingRef: item.bookingRef || "",
      paidByMemberId: item.paidByMemberId || item.paidByMember?.id || "",
      participantMemberIds,
    });
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

      await loadTrip();
      await loadActivity();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to upload trip cover");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function uploadDocument() {
    if (!tripId || !token || !canUploadTripDocuments || uploadingDocument) return;

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

      const form = new FormData();
      form.append("title", title);
      form.append("category", documentDraft.category);
      form.append("visibility", documentDraft.visibility);
      form.append("note", documentDraft.note.trim());
      form.append("file", documentDraft.file);

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

      const created = await res.json();
      setDocuments((current) => [created, ...current]);
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
    const derivedGolfTitle =
      currentItem?.course?.name || editDraft.title.trim() || "Golf round";

    if (
      !editDraft.type ||
      (!isGolfEdit && !isFlightEdit && !editDraft.title.trim()) ||
      !editDraft.date
    ) {
      setErr("Type, title, and date are required.");
      return;
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
            endDate: isGolfEdit ? undefined : optionalText(editDraft.endDate),
            startTime: editDraft.type === "hotel" ? "" : optionalText(editDraft.startTime),
            endTime: editDraft.type === "hotel" ? "" : optionalText(editDraft.endTime),
            provider: optionalText(editDraft.provider),
            bookingRef: isFlightEdit ? optionalText(editDraft.bookingRef) : undefined,
            notes: optionalText(editDraft.notes),
            greenFee: isFlightEdit ? undefined : optionalNumber(editDraft.greenFee),
            caddyFee: isFlightEdit ? undefined : optionalNumber(editDraft.caddyFee),
            cartFee: isFlightEdit ? undefined : optionalNumber(editDraft.cartFee),
            includeGreenFeeInSplit: editDraft.includeGreenFeeInSplit,
            includeCaddyFeeInSplit: editDraft.includeCaddyFeeInSplit,
            includeCartFeeInSplit: editDraft.includeCartFeeInSplit,
            directPrice: isFlightEdit ? undefined : optionalNumber(editDraft.directPrice),
            providerPrice:
              isGolfEdit || editDraft.type === "hotel" || isFlightEdit
                ? undefined
                : optionalNumber(editDraft.providerPrice),
            currency: isFlightEdit ? undefined : optionalText(editDraft.currency),
            locationName: isFlightEdit ? optionalText(editDraft.locationName) : undefined,
            address: isFlightEdit ? optionalText(editDraft.address) : undefined,
            paidByMemberId: isFlightEdit ? undefined : optionalText(editDraft.paidByMemberId),
            participantMemberIds: editDraft.participantMemberIds,
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
      const startKey = dayKeyFromValue(itemDateValue(item));
      if (!startKey) return;

      const endKey = dayKeyFromValue(item.endDate) || startKey;
      for (const key of dayKeysBetween(startKey, endKey)) {
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
          Flight: 0,
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
      if (itemType === "transfer") transfers += 1;

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
      Activity: 0,
      Other: 0,
    };
    const currencies = new Set<string>();
    let greenTotal = 0;
    let directTotal = 0;
    let providerTotal = 0;
    let caddyTotal = 0;
    let cartTotal = 0;

    for (const item of trip?.items ?? []) {
      if (isFlightItem(item)) continue;

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
      const itemTotal = green + direct + provider + caddy + cart;

      if (itemTotal > 0) {
        currencies.add(item.currency?.trim() || "CHF");
      }

      greenTotal += green;
      directTotal += direct;
      providerTotal += provider;
      caddyTotal += caddy;
      cartTotal += cart;
      categories[budgetCategory(item.type)] += itemTotal;
    }

    const total = greenTotal + directTotal + providerTotal + caddyTotal + cartTotal;
    const people = trip?.members?.length ?? 0;
    const currency = Array.from(currencies)[0] || "CHF";

    return {
      mixedCurrencies: currencies.size > 1,
      currency,
      total,
      perPerson: people > 0 ? total / people : total,
      greenTotal,
      directTotal,
      providerTotal,
      caddyTotal,
      cartTotal,
      categories,
    };
  }, [trip?.items, trip?.members]);

  const memberCount = trip?.members?.length ?? 0;
  const itemCount = trip?.items?.length ?? 0;
  const tripRange = tripDateRange(trip?.items);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayItems = (trip?.items ?? []).filter((item) => dateKey(item) === todayKey);
  const futureItems = (trip?.items ?? [])
    .filter((item) => {
      const key = dateKey(item);
      return key !== "unscheduled" && key >= todayKey;
    })
    .slice(0, 3);
  const focusItems = todayItems.length > 0 ? todayItems.slice(0, 3) : futureItems;
  const focusTitle = todayItems.length > 0 ? "Today" : "Next up";
  const budgetCards = [
    { label: "Total budget", value: budgetSummary.total },
    { label: "Golf cost", value: budgetSummary.categories.Golf },
    { label: "Hotel cost", value: budgetSummary.categories.Hotel },
    { label: "Transport cost", value: budgetSummary.categories.Transfer },
    { label: "Estimated per person", value: budgetSummary.perPerson },
  ];
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
    { label: "Activity", value: budgetSummary.categories.Activity },
    { label: "Other", value: budgetSummary.categories.Other },
  ];

  const filteredDocuments = useMemo(() => {
    if (documentCategoryFilter === "ALL") return documents;

    return documents.filter(
      (document) => document.category === documentCategoryFilter,
    );
  }, [documentCategoryFilter, documents]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 760,
        margin: "0 auto",
        boxSizing: "border-box",
        overflowX: "hidden",
        padding:
          activeView === "overview"
            ? "16px 16px calc(96px + env(safe-area-inset-bottom, 0px))"
            : "4px 12px calc(112px + env(safe-area-inset-bottom, 0px))",
        display: "grid",
        gap: activeView === "overview" ? 16 : 8,
      }}
    >
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
                  "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.78))",
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
              border: "1px solid var(--border)",
              background: "rgba(0,0,0,0.38)",
              color: "var(--text)",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 12,
              backdropFilter: "blur(10px)",
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
                      background: "var(--text)",
                      color: "var(--bg)",
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
                      background: "transparent",
                      color: "var(--sub)",
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

          {canEditTrip ? (
            <div style={{ ...wrappingActionRowStyle, opacity: 0.82 }}>
              {!editingTrip ? (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadCover(e.target.files?.[0])}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={!trip || deletingTrip || uploadingCover}
                  style={{
                    height: 28,
                    padding: "0 9px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--sub)",
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
                  type="button"
                  onClick={startTripEdit}
                  disabled={!trip || deletingTrip}
                  style={{
                    height: 28,
                    padding: "0 9px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--sub)",
                    cursor: !trip || deletingTrip ? "default" : "pointer",
                    fontWeight: 900,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  Edit Trip
                </button>
                <button
                  type="button"
                  onClick={openInviteSheet}
                  disabled={!trip || deletingTrip || inviteBusy}
                  style={{
                    height: 28,
                    padding: "0 9px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--sub)",
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
                  type="button"
                  onClick={openDeleteTripConfirm}
                  disabled={!trip || deletingTrip}
                  style={{
                    height: 28,
                    padding: "0 9px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--sub)",
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
            <button
              type="button"
              onClick={() => {
                if (tripId) nav(`/trips/${tripId}/add-item`);
              }}
              disabled={editingTrip || deletingTrip}
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--text)",
                color: "var(--bg)",
                cursor: editingTrip || deletingTrip ? "default" : "pointer",
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              + Add Item
            </button>
            </div>
          ) : null}
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          width: "100%",
          maxWidth: "100%",
          gap: 10,
          boxSizing: "border-box",
        }}
      >
        {(["timeline", "calendar", "documents", "map", "budget"] as TripView[]).map((view) => {
          const label = tripViewLabel(view);
          return (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              style={{
                minHeight: 86,
                padding: 16,
                borderRadius: 30,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "var(--card)",
                color: "var(--text)",
                cursor: "pointer",
                fontWeight: 950,
                fontSize: 15,
                display: "grid",
                alignContent: "center",
                justifyItems: "start",
                gap: 5,
                boxShadow: "0 14px 34px rgba(0,0,0,0.18)",
                overflow: "hidden",
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  color: "var(--sub)",
                  fontSize: 11,
                  fontWeight: 850,
                }}
              >
                {tripViewSubtitle(view)}
              </span>
            </button>
          );
        })}
      </div>

      <section
        style={{
          ...safeSectionStyle,
          display: "grid",
          gap: 10,
          padding: 14,
          borderRadius: 22,
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 12px 34px rgba(0,0,0,0.16)",
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
            <div style={{ color: "var(--text)", fontSize: 16, fontWeight: 950 }}>
              Recent activity
            </div>
            <div style={{ color: "var(--sub)", fontSize: 12 }}>
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
              border: "1px solid var(--border)",
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
              border: "1px dashed var(--border)",
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
                  padding: "9px 0",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 15,
                  }}
                >
                  {activityIcon(entry.type)}
                </div>
                <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: 13,
                      lineHeight: 1.35,
                      fontWeight: 850,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {entry.message}
                  </div>
                  <div
                    style={{
                      color: "var(--sub)",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {formatActivityDate(entry.createdAt)}
                  </div>
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
          gap: activeView === "overview" ? 16 : 6,
        }}
      >
        {activeView !== "overview" ? (
        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: 0,
            minHeight: 34,
          }}
        >
          <div style={{ minWidth: 0, display: "grid", gap: 1 }}>
            <div
              style={{
                color: "var(--text)",
                fontSize: 17,
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
                lineHeight: 1.2,
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
              height: 28,
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

        {activeView === "timeline" ? (
      <>

      <section
        style={{
          ...safeSectionStyle,
          display: "grid",
          gap: 12,
          padding: 14,
          borderRadius: 22,
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 12px 34px rgba(0,0,0,0.16)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
            <div style={{ color: "var(--text)", fontSize: 16, fontWeight: 950 }}>
              {focusTitle}
            </div>
            <div style={{ color: "var(--sub)", fontSize: 12 }}>
              {focusItems.length > 0
                ? "Your upcoming itinerary highlights"
                : "Add dated items to build your daily plan"}
            </div>
          </div>
          {canEditTrip && focusItems.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                if (tripId) nav(`/trips/${tripId}/add-item`);
              }}
              style={{
                height: 32,
                padding: "0 11px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--text)",
                color: "var(--bg)",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              + Add Item
            </button>
          ) : null}
        </div>

        {focusItems.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            {focusItems.map((item) => (
              <article
                key={`focus-${item.id}`}
                style={{
                  display: "grid",
                  gap: 7,
                  padding: 12,
                  borderRadius: 28,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "var(--bg)",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--sub)",
                    fontSize: 11,
                    fontWeight: 950,
                  }}
                >
                  <span>{itemIcon(item.type)}</span>
                  <span>{itemTypeLabel(item.type)}</span>
                  <span>{formatDateLabel(dateKey(item))}</span>
                </div>
                <div
                  style={{
                    color: "var(--text)",
                    fontSize: 15,
                    lineHeight: 1.25,
                    fontWeight: 950,
                    overflowWrap: "anywhere",
                  }}
                >
                  {(isGolfItem(item) && item.course?.name) ||
                    item.title ||
                    item.locationName ||
                    itemTypeLabel(item.type)}
                </div>
                {previewLine(item) ? (
                  <div
                    style={{
                      color: "var(--sub)",
                      fontSize: 12,
                      lineHeight: 1.35,
                      fontWeight: 850,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {previewLine(item)}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      </>
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

      {loading ? (
        <div style={{ color: "var(--sub)", fontSize: 13 }}>Loading...</div>
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
              {canEditTrip
                ? "Add the first round, hotel, transfer, or note to start building this trip."
                : "Trip admins have not added timeline items yet."}
            </div>
            {canEditTrip ? (
              <button
                type="button"
                onClick={() => {
                  if (tripId) nav(`/trips/${tripId}/add-item`);
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
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 950,
                padding: "0 2px",
              }}
            >
              {formatDateLabel(key)}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {items.map((item, itemIndex) => {
                const prices = pricingParts(item);
                const time = formatTimeRange(item);
                const dateRange = formatDateRange(item);
                const details = timelineDetails(item);
                const participantText = participantSummary(
                  item,
                  trip?.members ?? [],
                );
                const payerText = payerSummary(item);
                const courseId = item.course?.id ?? item.courseId;
                const courseName = item.course?.name;
                const itemType = String(item.type ?? "").toLowerCase();
                const typeLabel = itemTypeLabel(item.type);
                const isGolf =
                  itemType === "golf_round" || itemType === "course";
                const canOpenCourse = isGolf && !!courseId;
                const isEditing = editingItemId === item.id && !!editDraft;
                const editIsGolf =
                  editDraft?.type === "golf_round" ||
                  editDraft?.type === "course";
                const editIsHotel = editDraft?.type === "hotel";
                const editIsFlight = editDraft?.type === "flight";
                const editOrganizerTotal = editDraft
                  ? (editDraft.includeGreenFeeInSplit
                      ? amountValue(editDraft.greenFee)
                      : 0) +
                    (editDraft.includeCaddyFeeInSplit
                      ? amountValue(editDraft.caddyFee)
                      : 0) +
                    (editDraft.includeCartFeeInSplit
                      ? amountValue(editDraft.cartFee)
                      : 0)
                  : 0;
                const isMoving = movingItemId === item.id;
                const canMoveUp =
                  canEditTrip && itemIndex > 0 && !isMoving;
                const canMoveDown =
                  canEditTrip &&
                  itemIndex < items.length - 1 &&
                  !isMoving;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "24px minmax(0, 1fr)",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        justifyItems: "center",
                        alignContent: "start",
                        gap: 6,
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: "3px solid var(--card)",
                          background: "var(--text)",
                          boxShadow: "0 0 0 1px var(--border)",
                          marginTop: 15,
                        }}
                      />
                      <div
                        aria-hidden="true"
                        style={{
                          width: 1,
                          minHeight: 72,
                          background: "var(--border)",
                        }}
                      />
                    </div>

                    <article
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        display: "grid",
                        gap: 9,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        <div
                          aria-hidden="true"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            display: "grid",
                            placeItems: "center",
                            background: "var(--bg)",
                            flexShrink: 0,
                          }}
                        >
                          {itemIcon(item.type)}
                        </div>

                        <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: 999,
                                padding: "3px 8px",
                                background: "var(--bg)",
                                color: "var(--sub)",
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                            >
                              {typeLabel}
                            </span>
                            {isGolf && courseName ? (
                              <span
                                style={{
                                  border: "1px solid var(--border)",
                                  borderRadius: 999,
                                  padding: "3px 8px",
                                  background: "var(--bg)",
                                  color: "var(--text)",
                                  fontSize: 11,
                                  fontWeight: 950,
                                }}
                              >
                                Linked course
                              </span>
                            ) : null}
                          </div>

                          <div
                            style={{
                              fontWeight: 950,
                              color: "var(--text)",
                              lineHeight: 1.25,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.title || "Untitled item"}
                          </div>

                          {courseName ? (
                            <div
                              style={{
                                color: "var(--sub)",
                                fontSize: 13,
                                fontWeight: isGolf ? 900 : 700,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {isGolf ? `Course: ${courseName}` : courseName}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {isEditing ? (
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            paddingTop: 2,
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
                                  fontSize: 12,
                                  fontWeight: 950,
                                }}
                              >
                                Participants
                              </div>
                              <div style={{ display: "grid", gap: 6 }}>
                                {(trip?.members ?? []).map((member) => {
                                  const checked =
                                    editDraft.participantMemberIds.includes(
                                      member.id,
                                    );
                                  return (
                                    <label
                                      key={member.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        color: "var(--text)",
                                        fontSize: 12,
                                        fontWeight: 850,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          setEditDraft({
                                            ...editDraft,
                                            participantMemberIds: e.target
                                              .checked
                                              ? [
                                                  ...editDraft.participantMemberIds,
                                                  member.id,
                                                ]
                                              : editDraft.participantMemberIds.filter(
                                                  (id) => id !== member.id,
                                                ),
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
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    date: e.target.value,
                                  })
                                }
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
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      endDate: e.target.value,
                                    })
                                  }
                                  style={editFieldStyle}
                                />
                                {editIsFlight || editIsHotel ? (
                                  <span
                                    style={{
                                      color: "var(--sub)",
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                  >
                                    {editIsFlight
                                      ? "Optional for overnight or connecting flights"
                                      : "Optional for multi-day stays"}
                                  </span>
                                ) : null}
                              </label>
                            ) : null}
                            {!editIsHotel ? (
                              <>
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
                              </>
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
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(140px, 1fr))",
                                gap: 8,
                              }}
                            >
                              <input
                                value={editDraft.locationName}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    locationName: e.target.value,
                                  })
                                }
                                placeholder="From airport"
                                style={editFieldStyle}
                              />
                              <input
                                value={editDraft.address}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    address: e.target.value,
                                  })
                                }
                                placeholder="To airport"
                                style={editFieldStyle}
                              />
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
                            </div>
                          ) : null}

                          {editIsGolf ? (
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
                                  fontSize: 12,
                                  fontWeight: 950,
                                }}
                              >
                                Golf costs
                              </div>
                              {[
                                {
                                  label: "Greenfee",
                                  value: editDraft.greenFee,
                                  amountKey: "greenFee",
                                  checked: editDraft.includeGreenFeeInSplit,
                                  includeKey: "includeGreenFeeInSplit",
                                },
                                {
                                  label: "Caddyfee",
                                  value: editDraft.caddyFee,
                                  amountKey: "caddyFee",
                                  checked: editDraft.includeCaddyFeeInSplit,
                                  includeKey: "includeCaddyFeeInSplit",
                                },
                                {
                                  label: "Cartfee",
                                  value: editDraft.cartFee,
                                  amountKey: "cartFee",
                                  checked: editDraft.includeCartFeeInSplit,
                                  includeKey: "includeCartFeeInSplit",
                                },
                              ].map((cost) => (
                                <div key={cost.label} style={{ display: "grid", gap: 6 }}>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    value={cost.value}
                                    onChange={(e) =>
                                      setEditDraft({
                                        ...editDraft,
                                        [cost.amountKey]: e.target.value,
                                      })
                                    }
                                    placeholder={cost.label}
                                    style={editFieldStyle}
                                  />
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
                                      onChange={(e) =>
                                        setEditDraft({
                                          ...editDraft,
                                          [cost.includeKey]: e.target.checked,
                                        })
                                      }
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
                                  fontSize: 12,
                                  fontWeight: 950,
                                }}
                              >
                                <span>Organizer total</span>
                                <span>{editOrganizerTotal.toLocaleString()}</span>
                              </div>
                            </div>
                          ) : null}

                          {!editIsGolf && !editIsFlight ? (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(0, 1fr) minmax(0, 1fr)",
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
                                {editIsHotel ? "Amount per day" : "Direct price"}
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={editDraft.directPrice}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      directPrice: e.target.value,
                                    })
                                  }
                                  placeholder={
                                    editIsHotel ? "Amount per day" : "Direct price"
                                  }
                                  style={editFieldStyle}
                                />
                                {editIsHotel ? (
                                  <span
                                    style={{
                                      color: "var(--sub)",
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                  >
                                    Use notes for breakfast included, room details or price comparisons.
                                  </span>
                                ) : null}
                              </label>
                              {!editIsHotel ? (
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={editDraft.providerPrice}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      providerPrice: e.target.value,
                                    })
                                  }
                                  placeholder="Provider price"
                                  style={editFieldStyle}
                                />
                              ) : null}
                            </div>
                          ) : null}

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
                            Currency
                            <select
                              value={editDraft.currency || "CHF"}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  currency: e.target.value,
                                })
                              }
                              style={editFieldStyle}
                            >
                              {currencyOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          ) : null}

                          {(trip?.members ?? []).length > 0 && !editIsFlight ? (
                            <label
                              style={{
                                display: "grid",
                                gap: 6,
                                color: "var(--text)",
                                fontSize: 12,
                                fontWeight: 900,
                              }}
                            >
                              Paid by
                              <select
                                value={editDraft.paidByMemberId}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    paidByMemberId: e.target.value,
                                  })
                                }
                                style={editFieldStyle}
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
                                ? "Breakfast included/excluded, direct vs provider comparison, room type, cancellation details"
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
                                background: "var(--text)",
                                color: "var(--bg)",
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
                              }}
                              disabled={savingItemId === item.id}
                              style={{
                                height: 30,
                                padding: "0 12px",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                background: "transparent",
                                color: "var(--sub)",
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
                              gap: 7,
                              padding: "8px 10px",
                              borderRadius: 12,
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                color: "var(--text)",
                                fontSize: 12,
                                fontWeight: 950,
                              }}
                            >
                              <span>{dateRange || formatDateLabel(dateKey(item))}</span>
                              {time ? <span>{time}</span> : null}
                            </div>

                            {details.length > 0 ? (
                              <div style={{ display: "grid", gap: 5 }}>
                                {details.map((detail) => (
                                  <div
                                    key={`${detail.label}-${detail.value}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "72px minmax(0, 1fr)",
                                      gap: 8,
                                      color: "var(--sub)",
                                      fontSize: 12,
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    <span style={{ fontWeight: 900 }}>
                                      {detail.label}
                                    </span>
                                    <span
                                      style={{
                                        color: "var(--text)",
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {detail.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {prices.length > 0 ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                  color: "var(--sub)",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                {prices.map((price) => (
                                  <span key={price}>{price}</span>
                                ))}
                              </div>
                            ) : null}

                            {participantText ? (
                              <div
                                style={{
                                  color: "var(--sub)",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                Participants: {participantText}
                              </div>
                            ) : null}

                            {payerText ? (
                              <div
                                style={{
                                  color: "var(--sub)",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                Paid by {payerText}
                              </div>
                            ) : null}
                          </div>

                          {item.notes ? (
                            <div
                              style={{
                                color: "var(--text)",
                                fontSize: 13,
                                lineHeight: 1.45,
                              }}
                            >
                              {item.notes}
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
                                  style={{
                                    height: 30,
                                    padding: "0 9px",
                                    borderRadius: 999,
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--sub)",
                                    cursor: canMoveUp ? "pointer" : "default",
                                    opacity: canMoveUp ? 1 : 0.45,
                                    fontWeight: 900,
                                    fontSize: 12,
                                  }}
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItem(item.id, "down")}
                                  disabled={!canMoveDown}
                                  style={{
                                    height: 30,
                                    padding: "0 9px",
                                    borderRadius: 999,
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--sub)",
                                    cursor: canMoveDown ? "pointer" : "default",
                                    opacity: canMoveDown ? 1 : 0.45,
                                    fontWeight: 900,
                                    fontSize: 12,
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
                            {canEditTrip ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  disabled={deletingItemId === item.id}
                                  style={{
                                    height: 30,
                                    padding: "0 10px",
                                    borderRadius: 999,
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--sub)",
                                    cursor:
                                      deletingItemId === item.id
                                        ? "default"
                                        : "pointer",
                                    fontWeight: 900,
                                    fontSize: 12,
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteItem(item.id)}
                                  disabled={deletingItemId === item.id}
                                  style={{
                                    height: 30,
                                    padding: "0 10px",
                                    borderRadius: 999,
                                    border: "1px solid var(--border)",
                                    background: "transparent",
                                    color: "var(--sub)",
                                    cursor:
                                      deletingItemId === item.id
                                        ? "default"
                                        : "pointer",
                                    fontWeight: 900,
                                    fontSize: 12,
                                  }}
                                >
                                  {deletingItemId === item.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </>
                      )}
                    </article>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </section>
      ) : activeView === "calendar" ? (
        <TripCalendarView
          days={calendarDays}
          members={trip?.members ?? []}
          selectedDay={selectedCalendarDay}
          onSelectDay={setSelectedCalendarDay}
          canEditTrip={canEditTrip}
          onAddItem={() => {
            if (tripId) nav(`/trips/${tripId}/add-item`);
          }}
          onOpenCourse={(courseId) => nav(`/courses/${courseId}`)}
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
                background: "var(--card)",
                border: "1px solid var(--border)",
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
                <span>Private document – only visible to me</span>
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
              background: "var(--card)",
              border: "1px solid var(--border)",
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
                      background: active ? "var(--text)" : "var(--bg)",
                      color: active ? "var(--bg)" : "var(--sub)",
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
                              background: "transparent",
                              color: "var(--sub)",
                              cursor:
                                deletingDocumentId === document.id
                                  ? "default"
                                  : "pointer",
                              fontWeight: 900,
                              fontSize: 12,
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
            background: "var(--card)",
            border: "1px solid var(--border)",
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
        </section>
      ) : activeView === "map" ? (
        <TripMapView
          markers={mapMarkers}
          onOpenCourse={(courseId) => nav(`/courses/${courseId}`)}
        />
      ) : null}
      </div>

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
                  background: "transparent",
                  color: "var(--text)",
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
                  border: "1px solid var(--danger)",
                  background:
                    deletingTrip || deleteTripTitleInput !== trip.title
                      ? "transparent"
                      : "var(--danger-soft)",
                  color:
                    deletingTrip || deleteTripTitleInput !== trip.title
                      ? "var(--sub)"
                      : "var(--danger)",
                  cursor:
                    deletingTrip || deleteTripTitleInput !== trip.title
                      ? "default"
                      : "pointer",
                  fontWeight: 950,
                  fontSize: 13,
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
  );
}
