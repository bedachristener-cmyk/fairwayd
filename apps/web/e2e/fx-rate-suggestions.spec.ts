import { expect, test } from "@playwright/test";
import {
  applyFxSuggestion,
  isFxSuggestionEligible,
  markFxSuggestionUnavailable,
  type FxSuggestionDraft,
} from "../src/utils/fxRateSuggestions";
import { resolveTripCostConversion } from "../src/utils/tripCostAccounting";

function draft(overrides: Partial<FxSuggestionDraft> = {}): FxSuggestionDraft {
  return {
    localId: "new-cost",
    amount: "9400",
    currency: "THB",
    exchangeRate: "",
    baseAmount: "",
    exchangeRateManuallyEdited: false,
    hasStoredConversion: false,
    fxSuggestionStatus: "idle",
    fxSuggestionDate: "",
    fxSuggestionSource: "",
    fxSuggestionVersion: 0,
    ...overrides,
  };
}

const suggestion = {
  from: "THB",
  to: "CHF",
  rate: 0.0221,
  date: "2026-10-07",
  source: "Frankfurter",
};

test.describe("editable FX rate suggestions", () => {
  test("a new foreign cost accepts a suggestion and updates its equivalent", () => {
    const unresolved = draft();
    expect(isFxSuggestionEligible(unresolved, "CHF")).toBe(true);

    const suggested = applyFxSuggestion(unresolved, "CHF", suggestion, 0);
    expect(suggested.exchangeRate).toBe("0.0221");
    expect(suggested.fxSuggestionStatus).toBe("suggested");
    expect(suggested.fxSuggestionDate).toBe("2026-10-07");

    const conversion = resolveTripCostConversion(
      { amount: 9400, currency: "THB", exchangeRate: Number(suggested.exchangeRate) },
      "CHF",
    );
    expect(conversion.amount).toBe(207.74);
  });

  test("the user can overwrite a suggested rate", () => {
    const suggested = applyFxSuggestion(draft(), "CHF", suggestion, 0);
    const manuallyEdited = {
      ...suggested,
      exchangeRate: "0.0224",
      exchangeRateManuallyEdited: true,
      fxSuggestionStatus: "manual" as const,
    };
    expect(manuallyEdited.exchangeRate).toBe("0.0224");
    expect(isFxSuggestionEligible(manuallyEdited, "CHF")).toBe(false);
  });

  test("a late async response cannot overwrite a manually entered rate", () => {
    const manuallyEdited = draft({
      exchangeRate: "0.0224",
      exchangeRateManuallyEdited: true,
      fxSuggestionStatus: "manual",
    });
    expect(applyFxSuggestion(manuallyEdited, "CHF", suggestion, 0)).toBe(manuallyEdited);
  });

  test("a response from an older request generation cannot apply after switching away and back", () => {
    const current = draft({ fxSuggestionVersion: 2 });
    expect(applyFxSuggestion(current, "CHF", suggestion, 0)).toBe(current);
    expect(current.exchangeRate).toBe("");
    expect(current.fxSuggestionStatus).toBe("idle");
  });

  test("a failure from an older request generation cannot mark the current draft unavailable", () => {
    const current = draft({ fxSuggestionVersion: 2 });
    expect(
      markFxSuggestionUnavailable(current, "THB", "CHF", "CHF", 0),
    ).toBe(current);
    expect(current.fxSuggestionStatus).toBe("idle");
  });

  test("an existing saved conversion snapshot is never eligible or repriced", () => {
    const saved = draft({
      localId: "saved-cost",
      exchangeRate: "0.0224",
      baseAmount: "210.56",
      hasStoredConversion: true,
    });
    expect(isFxSuggestionEligible(saved, "CHF")).toBe(false);
    expect(applyFxSuggestion(saved, "CHF", suggestion, 0)).toBe(saved);

    const historical = resolveTripCostConversion(
      { amount: 9400, currency: "THB", exchangeRate: 0.0224, baseAmount: 210.56 },
      "CHF",
    );
    expect(historical.amount).toBe(210.56);
  });

  test("provider failure keeps unresolved manual entry usable", () => {
    const unavailable = markFxSuggestionUnavailable(
      draft(),
      "THB",
      "CHF",
      "CHF",
      0,
    );
    expect(unavailable.fxSuggestionStatus).toBe("unavailable");
    expect(unavailable.exchangeRate).toBe("");
    expect(unavailable.exchangeRateManuallyEdited).toBe(false);
  });

  test("a base-currency cost does not qualify for an FX request", () => {
    expect(isFxSuggestionEligible(draft({ currency: "CHF" }), "CHF")).toBe(false);
  });
});
