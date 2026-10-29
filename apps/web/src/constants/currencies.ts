export const DEFAULT_CURRENCY = "CHF";

export const CURRENCY_OPTIONS = [
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
] as const;

export type SupportedCurrency = (typeof CURRENCY_OPTIONS)[number];
