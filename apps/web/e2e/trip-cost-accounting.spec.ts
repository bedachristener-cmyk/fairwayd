import { expect, test } from "@playwright/test";
import {
  calculateTripCostShare,
  resolveTripCostConversion,
} from "../src/utils/tripCostAccounting";

test.describe("Trip cost base-currency accounting", () => {
  test("keeps a CHF cost unchanged", () => {
    expect(
      resolveTripCostConversion({ amount: 220, currency: "CHF" }, "CHF"),
    ).toEqual({ amount: 220, exchangeRate: 1, missingConversion: false });
  });

  test("converts THB using the captured exchange rate", () => {
    expect(
      resolveTripCostConversion(
        { amount: 9400, currency: "THB", exchangeRate: 0.0224 },
        "CHF",
      ),
    ).toEqual({
      amount: 210.56,
      exchangeRate: 0.0224,
      missingConversion: false,
    });
  });

  test("splits converted TOTAL and PER_PERSON costs in base currency", () => {
    const cost = { amount: 9400, currency: "THB", exchangeRate: 0.0224 };

    expect(
      calculateTripCostShare({ ...cost, costMode: "TOTAL" }, "CHF", 2),
    ).toEqual({
      baseAmount: 210.56,
      totalBaseAmount: 210.56,
      personalShare: 105.28,
      missingConversion: false,
    });
    expect(
      calculateTripCostShare(
        { ...cost, costMode: "PER_PERSON" },
        "CHF",
        2,
      ),
    ).toEqual({
      baseAmount: 210.56,
      totalBaseAmount: 421.12,
      personalShare: 210.56,
      missingConversion: false,
    });
  });

  test("does not silently turn a missing foreign conversion into a valid zero", () => {
    expect(
      resolveTripCostConversion({ amount: 9400, currency: "THB" }, "CHF"),
    ).toEqual({
      amount: 0,
      exchangeRate: null,
      missingConversion: true,
    });
  });
});
