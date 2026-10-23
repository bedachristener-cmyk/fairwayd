import { GolfServiceCategory } from '@prisma/client';
import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GolfServicesService } from './golf-services.service';

describe('GolfServicesService (read-only)', () => {
  const oldToggle = process.env.GOLF_SERVICES_API_ENABLED;
  const findMany = jest.fn();
  const findCourses = jest.fn();
  const prisma = {
    golfServiceVenue: { findMany },
    course: { findMany: findCourses },
  } as unknown as PrismaService;
  const service = new GolfServicesService(prisma);

  beforeEach(() => {
    findCourses.mockResolvedValue([]);
  });

  afterEach(() => {
    findMany.mockReset();
    findCourses.mockReset();
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
    expect(findCourses).not.toHaveBeenCalled();
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

  it('returns services on an existing golf course by Course ID without a second venue', async () => {
    process.env.GOLF_SERVICES_API_ENABLED = 'true';
    findMany.mockResolvedValue([]);
    findCourses.mockResolvedValue([{
      id: 'course-basel-1',
      lat: 47.55,
      lon: 7.59,
      serviceOfferings: [
        { id: 'sim', category: GolfServiceCategory.SIMULATOR, unitCount: 2 },
        { id: 'fitting', category: GolfServiceCategory.FITTING },
      ],
      serviceProviderLinks: [{
        role: 'GOLF_PRO',
        provider: { id: 'coach', name: 'Local pro', kind: 'PERSON', website: null },
      }],
    }]);

    const result = await service.nearby({
      lat: 47.55, lon: 7.59, radiusKm: 25,
    });

    expect(result.items).toEqual([]);
    expect(result.courseServices).toEqual([{
      courseId: 'course-basel-1',
      offerings: [
        { id: 'sim', category: GolfServiceCategory.SIMULATOR, unitCount: 2 },
        { id: 'fitting', category: GolfServiceCategory.FITTING },
      ],
      venueProviders: [{
        role: 'GOLF_PRO',
        provider: { id: 'coach', name: 'Local pro', kind: 'PERSON', website: null },
      }],
    }]);
    expect(findCourses).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        active: true,
        serviceOfferings: { some: expect.objectContaining({
          status: 'VERIFIED',
          verifiedAt: { not: null },
        }) },
      }),
      select: expect.objectContaining({
        id: true,
        serviceOfferings: expect.objectContaining({
          where: expect.objectContaining({ status: 'VERIFIED', verifiedAt: { not: null } }),
        }),
        serviceProviderLinks: expect.objectContaining({
          where: expect.objectContaining({ status: 'VERIFIED', verifiedAt: { not: null } }),
        }),
      }),
    }));
  });

  it('applies service category and cross-border filter to linked Courses', async () => {
    process.env.GOLF_SERVICES_API_ENABLED = 'true';
    findMany.mockResolvedValue([]);
    findCourses.mockResolvedValue([{
      id: 'near-course', lat: 47.55, lon: 7.59,
      serviceOfferings: [
        { id: 'one', category: GolfServiceCategory.SIMULATOR },
        { id: 'two', category: GolfServiceCategory.SHOP },
      ],
      serviceProviderLinks: [],
    }, {
      id: 'far-course', lat: 48.55, lon: 7.59,
      serviceOfferings: [{ id: 'three', category: GolfServiceCategory.SIMULATOR }],
      serviceProviderLinks: [],
    }]);

    const response = await service.nearby({
      lat: 47.55, lon: 7.59, radiusKm: 25,
      category: GolfServiceCategory.SIMULATOR, country: 'CH',
    });
    expect(response.courseServices).toHaveLength(1);
    expect(response.courseServices[0].courseId).toBe('near-course');
    expect(response.courseServices[0].offerings).toEqual([
      { id: 'one', category: GolfServiceCategory.SIMULATOR },
    ]);
    expect(findCourses.mock.calls[0][0].where.country).toBe('CH');
    expect(findCourses.mock.calls[0][0].where.serviceOfferings.some.category).toBe(
      GolfServiceCategory.SIMULATOR,
    );
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
