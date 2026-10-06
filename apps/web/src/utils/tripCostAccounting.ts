export type TripCostAccountingInput = {
  amount?: number | null;
  currency?: string | null;
  exchangeRate?: number | null;
  baseAmount?: number | null;
  costMode?: "PER_PERSON" | "TOTAL" | null;
};

export type TripCostConversion = {
  amount: number;
  exchangeRate: number | null;
  missingConversion: boolean;
};

export function roundTripMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function resolveTripCostConversion(
  cost: TripCostAccountingInput,
  baseCurrency: string,
): TripCostConversion {
  const amount =
    typeof cost.amount === "number" && Number.isFinite(cost.amount)
      ? cost.amount
      : 0;
  const storedBaseAmount =
    typeof cost.baseAmount === "number" && Number.isFinite(cost.baseAmount)
      ? cost.baseAmount
      : null;
  const exchangeRate =
    typeof cost.exchangeRate === "number" &&
    Number.isFinite(cost.exchangeRate) &&
    cost.exchangeRate > 0
      ? cost.exchangeRate
      : null;

  if (
    storedBaseAmount !== null &&
    (storedBaseAmount > 0 || amount === 0)
  ) {
    return {
      amount: roundTripMoney(storedBaseAmount),
      exchangeRate:
        exchangeRate ?? (amount > 0 ? storedBaseAmount / amount : null),
      missingConversion: false,
    };
  }

  const currency = cost.currency?.trim();
  if (!currency || currency.toUpperCase() === baseCurrency.toUpperCase()) {
    return {
      amount: roundTripMoney(amount),
      exchangeRate: 1,
      missingConversion: false,
    };
  }

  if (exchangeRate) {
    return {
      amount: roundTripMoney(amount * exchangeRate),
      exchangeRate,
      missingConversion: false,
    };
  }

  return {
    amount: 0,
    exchangeRate: null,
    missingConversion: amount > 0,
  };
}

export function calculateTripCostShare(
  cost: TripCostAccountingInput,
  baseCurrency: string,
  participantCount: number,
) {
  const conversion = resolveTripCostConversion(cost, baseCurrency);
  const count = Math.max(participantCount, 0);
  const totalBaseAmount =
    cost.costMode === "PER_PERSON"
      ? conversion.amount * count
      : conversion.amount;
  const personalShare =
    count === 0
      ? 0
      : cost.costMode === "PER_PERSON"
        ? conversion.amount
        : conversion.amount / count;

  return {
    baseAmount: conversion.amount,
    totalBaseAmount: roundTripMoney(totalBaseAmount),
    personalShare: roundTripMoney(personalShare),
    missingConversion: conversion.missingConversion,
  };
}
