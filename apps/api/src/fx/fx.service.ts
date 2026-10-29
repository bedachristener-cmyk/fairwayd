import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { normalizeSupportedCurrency } from '../currency';

export type FxReferenceRate = {
  from: string;
  to: string;
  rate: number;
  date: string;
  source: 'Frankfurter' | 'Identity';
};

type CachedRate = {
  value: FxReferenceRate;
  expiresAt: number;
};

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev/v2';
const FX_CACHE_TTL_MS = 8 * 60 * 60 * 1000;
const FX_REQUEST_TIMEOUT_MS = 5_000;

@Injectable()
export class FxService {
  private readonly cache = new Map<string, CachedRate>();

  async getReferenceRate(fromInput: unknown, toInput: unknown) {
    let from: string;
    let to: string;
    try {
      from = normalizeSupportedCurrency(fromInput);
      to = normalizeSupportedCurrency(toInput);
    } catch {
      throw new BadRequestException('Unsupported currency');
    }

    if (from === to) {
      return {
        from,
        to,
        rate: 1,
        date: new Date().toISOString().slice(0, 10),
        source: 'Identity',
      } satisfies FxReferenceRate;
    }

    const cacheKey = `${from}:${to}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) this.cache.delete(cacheKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FX_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${FRANKFURTER_BASE_URL}/rate/${from.toLowerCase()}/${to.toLowerCase()}`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        },
      );
      if (!response.ok) throw new Error('Provider request failed');

      const data = (await response.json()) as Record<string, unknown>;
      const rate = data.rate;
      const date = data.date;
      const providerBase = data.base;
      const providerQuote = data.quote;
      if (
        typeof rate !== 'number' ||
        !Number.isFinite(rate) ||
        rate <= 0 ||
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        String(providerBase).toUpperCase() !== from ||
        String(providerQuote).toUpperCase() !== to
      ) {
        throw new Error('Invalid provider response');
      }

      const value: FxReferenceRate = {
        from,
        to,
        rate,
        date,
        source: 'Frankfurter',
      };
      this.cache.set(cacheKey, {
        value,
        expiresAt: Date.now() + FX_CACHE_TTL_MS,
      });
      return value;
    } catch {
      throw new ServiceUnavailableException(
        'Reference exchange rate unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
