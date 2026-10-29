export const DEFAULT_CURRENCY = 'CHF';

export const SUPPORTED_CURRENCIES = [
  'THB',
  'CHF',
  'EUR',
  'USD',
  'JPY',
  'GBP',
  'AUD',
  'SGD',
  'MYR',
  'IDR',
  'PHP',
  'ZAR',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function normalizeSupportedCurrency(input: unknown): SupportedCurrency {
  const currency = typeof input === 'string' ? input.trim().toUpperCase() : '';
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
    throw new Error('Unsupported currency');
  }
  return currency as SupportedCurrency;
}
