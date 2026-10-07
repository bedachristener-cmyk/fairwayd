import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FxService } from './fx.service';

function providerResponse(body: unknown) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('FxService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a normalized THB to CHF provider rate', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      providerResponse({
        date: '2026-10-07',
        base: 'THB',
        quote: 'CHF',
        rate: 0.0221,
      }),
    );

    await expect(
      new FxService().getReferenceRate('thb', 'chf'),
    ).resolves.toEqual({
      from: 'THB',
      to: 'CHF',
      rate: 0.0221,
      date: '2026-10-07',
      source: 'Frankfurter',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.frankfurter.dev/v2/rate/thb/chf',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('rejects unsupported currencies before requesting the provider', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(
      new FxService().getReferenceRate('XYZ', 'CHF'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns rate 1 for the same currency without a provider request', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(
      new FxService().getReferenceRate('eur', 'EUR'),
    ).resolves.toEqual(expect.objectContaining({ from: 'EUR', to: 'EUR', rate: 1 }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([0, -1, Number.NaN])(
    'rejects an invalid provider rate %s safely',
    async (rate) => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        providerResponse({
          date: '2026-10-07',
          base: 'THB',
          quote: 'CHF',
          rate,
        }),
      );

      await expect(
        new FxService().getReferenceRate('THB', 'CHF'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );

  it('turns a provider failure into a controlled error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('request timed out'));

    await expect(
      new FxService().getReferenceRate('THB', 'CHF'),
    ).rejects.toMatchObject({
      message: 'Reference exchange rate unavailable',
    });
  });

  it('aborts a timed-out provider request and returns a controlled error', async () => {
    jest.useFakeTimers();
    try {
      jest.spyOn(global, 'fetch').mockImplementation((_input, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        });
      });

      const result = new FxService().getReferenceRate('THB', 'CHF');
      const expectedResult = expect(result).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await jest.advanceTimersByTimeAsync(5_000);
      await expectedResult;
    } finally {
      jest.useRealTimers();
    }
  });

  it('serves repeated requests from the in-memory cache within the TTL', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      providerResponse({
        date: '2026-10-07',
        base: 'THB',
        quote: 'CHF',
        rate: 0.0221,
      }),
    );
    const service = new FxService();

    const first = await service.getReferenceRate('THB', 'CHF');
    const second = await service.getReferenceRate('thb', 'chf');

    expect(second).toEqual(first);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
