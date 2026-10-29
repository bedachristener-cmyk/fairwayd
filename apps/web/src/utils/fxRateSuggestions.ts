import type { FxReferenceRate } from "../api/fx";

export type FxSuggestionStatus = "idle" | "loading" | "suggested" | "unavailable" | "manual";

export type FxSuggestionDraft = {
  localId: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  baseAmount: string;
  exchangeRateManuallyEdited: boolean;
  hasStoredConversion: boolean;
  fxSuggestionStatus: FxSuggestionStatus;
  fxSuggestionDate: string;
  fxSuggestionSource: string;
  fxSuggestionVersion: number;
};

export function isFxSuggestionEligible(
  draft: FxSuggestionDraft,
  baseCurrency: string,
): boolean {
  const amount = Number(draft.amount);
  return (
    Number.isFinite(amount) &&
    amount > 0 &&
    Boolean(draft.currency) &&
    draft.currency !== baseCurrency &&
    draft.exchangeRate.trim() === "" &&
    draft.baseAmount.trim() === "" &&
    !draft.exchangeRateManuallyEdited &&
    !draft.hasStoredConversion &&
    draft.fxSuggestionStatus === "idle"
  );
}

export function applyFxSuggestion<T extends FxSuggestionDraft>(
  draft: T,
  baseCurrency: string,
  suggestion: FxReferenceRate,
  requestVersion: number,
): T {
  if (
    draft.fxSuggestionVersion !== requestVersion ||
    draft.currency !== suggestion.from ||
    baseCurrency !== suggestion.to ||
    draft.exchangeRate.trim() !== "" ||
    draft.baseAmount.trim() !== "" ||
    draft.exchangeRateManuallyEdited ||
    draft.hasStoredConversion
  ) {
    return draft;
  }

  return {
    ...draft,
    exchangeRate: String(suggestion.rate),
    fxSuggestionStatus: "suggested",
    fxSuggestionDate: suggestion.date,
    fxSuggestionSource: suggestion.source,
  };
}

export function markFxSuggestionUnavailable<T extends FxSuggestionDraft>(
  draft: T,
  from: string,
  to: string,
  baseCurrency: string,
  requestVersion: number,
): T {
  if (
    draft.fxSuggestionVersion !== requestVersion ||
    draft.currency !== from ||
    baseCurrency !== to ||
    draft.exchangeRate.trim() !== "" ||
    draft.exchangeRateManuallyEdited ||
    draft.hasStoredConversion
  ) {
    return draft;
  }

  return { ...draft, fxSuggestionStatus: "unavailable" };
}

export function formatFxSuggestionDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!date || Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
