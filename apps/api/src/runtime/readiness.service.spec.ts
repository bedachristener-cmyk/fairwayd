import { ReadinessService, READINESS_TIMEOUT_MS } from './readiness.service';
import { AppController } from '../app.controller';
import { ServiceUnavailableException } from '@nestjs/common';

describe('deployment readiness', () => {
  afterEach(() => jest.useRealTimers());

  it('requires a successful database query and stops accepting readiness during shutdown', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const readiness = new ReadinessService({ $queryRawUnsafe: query } as any);
    expect(await readiness.isReady()).toBe(true);
    expect(query).toHaveBeenCalledWith('SELECT 1');
    readiness.beginShutdown();
    expect(await readiness.isReady()).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns failure without leaking database details', async () => {
    const readiness = new ReadinessService({ $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('sensitive DB error')) } as any);
    const controller = new AppController({} as any, readiness);
    try { await controller.getReady(); throw new Error('Expected readiness failure'); }
    catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getStatus()).toBe(503);
      expect((error as ServiceUnavailableException).getResponse()).toEqual({ status: 'unavailable' });
    }
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });

  it('bounds slow checks and reuses a still-pending query across probes', async () => {
    jest.useFakeTimers();
    let finish!: () => void;
    const query = jest.fn().mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const readiness = new ReadinessService({ $queryRawUnsafe: query } as any);
    const first = readiness.isReady();
    await jest.advanceTimersByTimeAsync(READINESS_TIMEOUT_MS);
    expect(await first).toBe(false);
    const second = readiness.isReady();
    await jest.advanceTimersByTimeAsync(READINESS_TIMEOUT_MS);
    expect(await second).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    const third = readiness.isReady();
    finish();
    expect(await third).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not report healthy if shutdown begins while a query is running', async () => {
    let finish!: () => void;
    const readiness = new ReadinessService({ $queryRawUnsafe: () => new Promise<void>(resolve => { finish = resolve; }) } as any);
    const checking = readiness.isReady();
    await Promise.resolve();
    readiness.beginShutdown(); finish();
    expect(await checking).toBe(false);
  });
});
