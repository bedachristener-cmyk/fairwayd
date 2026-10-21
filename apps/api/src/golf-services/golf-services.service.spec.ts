import { GolfServiceCategory } from '@prisma/client';
import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GolfServicesService } from './golf-services.service';

describe('GolfServicesService (read-only)', () => {
  const oldToggle = process.env.GOLF_SERVICES_API_ENABLED;
  const findMany = jest.fn();
  const prisma = {
    golfServiceVenue: { findMany },
  } as unknown as PrismaService;
  const service = new GolfServicesService(prisma);

  afterEach(() => {
    findMany.mockReset();
    if (oldToggle === undefined) {
      delete process.env.GOLF_SERVICES_API_ENABLED;
    } else {
      process.env.GOLF_SERVICES_API_ENABLED = oldToggle;
    }
  });

  it('fails closed before migration and does not query the database', async () => {
    delete process.env.GOLF_SERVICES_API_ENABLED;
    await expect(service.nearby({
      lat: 47.55,
      lon: 7.59,
      radiusKm: 25,
    })).rejects.toThrow(ServiceUnavailableException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns only nearby places with verified services and distance', async () => {
    process.env.GOLF_SERVICES_API_ENABLED = 'true';
    findMany.mockResolvedValue([{
      id: 'lounge',
      name: 'Test Golf Lounge',
      country: 'CH',
      lat: 47.55,
      lon: 7.59,
      offerings: [{ id: 'sim', category: GolfServiceCategory.SIMULATOR, unitCount: 2 }],
      venueProviders: [],
    }, {
      id: 'far',
      name: 'Outside radius',
      country: 'CH',
      lat: 47.95,
      lon: 7.59,
      offerings: [{ id: 'sim2', category: GolfServiceCategory.SIMULATOR }],
      venueProviders: [],
    }]);

    const result = await service.nearby({
      lat: 47.55,
      lon: 7.59,
      radiusKm: 25,
      category: GolfServiceCategory.SIMULATOR,
    });
    expect(result.count).toBe(1);
    expect(result.items[0].id).toBe('lounge');
    expect(result.items[0].distanceKm).toBe(0);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'VERIFIED',
        offerings: { some: expect.objectContaining({
          status: 'VERIFIED',
          category: GolfServiceCategory.SIMULATOR,
        }) },
      }),
    }));
  });

  it('keeps the country filter optional for cross-border searches', async () => {
    process.env.GOLF_SERVICES_API_ENABLED = 'true';
    findMany.mockResolvedValue([]);
    await service.nearby({ lat: 47.55, lon: 7.59, radiusKm: 50 });
    expect(findMany.mock.calls[0][0].where.country).toBeUndefined();
    await service.nearby({ lat: 47.55, lon: 7.59, radiusKm: 50, country: 'CH' });
    expect(findMany.mock.calls[1][0].where.country).toBe('CH');
  });

  it('limits region results and only queries verified venues', async () => {
    process.env.GOLF_SERVICES_API_ENABLED = 'true';
    findMany.mockResolvedValue([
      { id: 'a', offerings: [{ category: GolfServiceCategory.SHOP }] },
      { id: 'b', offerings: [{ category: GolfServiceCategory.SHOP }] },
    ]);
    const result = await service.byRegion({
      country: 'CH',
      region: 'Basel-Landschaft',
      category: GolfServiceCategory.SHOP,
      take: 1,
    });
    expect(result.truncated).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(findMany.mock.calls[0][0].where.status).toBe('VERIFIED');
    expect(findMany.mock.calls[0][0].take).toBe(2);
  });
});
