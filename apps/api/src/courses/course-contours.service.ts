import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  buildCourseContourOverpassQuery,
  CourseContourBounds,
  CourseContourFeature,
  OverpassPayload,
  parseCourseContourFeatures,
  validateCourseContourBounds,
} from './course-contour';

type CacheEntry = {
  expiresAt: number;
  features: CourseContourFeature[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

@Injectable()
export class CourseContoursService {
  private readonly cache = new Map<string, CacheEntry>();

  async inBounds(bounds: CourseContourBounds) {
    const errors = validateCourseContourBounds(bounds);
    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }

    const cacheKey = [
      bounds.minLat,
      bounds.maxLat,
      bounds.minLon,
      bounds.maxLon,
    ]
      .map((value) => value.toFixed(4))
      .join(':');
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return this.response(cached.features, true);
    }

    try {
      const payload = await this.fetchPayload(
        buildCourseContourOverpassQuery(bounds),
      );
      const features = parseCourseContourFeatures(payload);

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        features,
      });

      return this.response(features, false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Overpass error';
      throw new BadGatewayException(
        `Golf contour source is temporarily unavailable: ${message}`,
      );
    }
  }

  private async fetchPayload(query: string): Promise<OverpassPayload> {
    const configuredEndpoint = process.env.OSM_OVERPASS_ENDPOINT?.trim();
    const endpoints = configuredEndpoint
      ? [configuredEndpoint]
      : DEFAULT_OVERPASS_ENDPOINTS;
    const failures: string[] = [];

    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18_000);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': 'Fairwayd/1.0 golf-course-contours-poc',
          },
          body: new URLSearchParams({ data: query }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return (await response.json()) as OverpassPayload;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'unknown failure';
        failures.push(`${endpoint}: ${message}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(failures.join('; '));
  }

  private response(features: CourseContourFeature[], cached: boolean) {
    return {
      type: 'FeatureCollection' as const,
      features: features.map((feature) => ({
        type: 'Feature' as const,
        id: feature.id,
        properties: {
          kind: feature.kind,
          name: feature.name,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [feature.coordinates],
        },
      })),
      source: 'OpenStreetMap',
      attribution: '© OpenStreetMap contributors',
      cached,
    };
  }
}
