export type CourseAdditionReviewDecision =
  | 'APPROVE'
  | 'REJECT'
  | 'REVIEW'
  | '';

export type ReviewedCourseAdditionInput = {
  country?: string;
  name?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  holes?: string;
  website?: string;
  googleLat?: string;
  googleLon?: string;
  placeId?: string;
  reviewDecision?: string;
  reviewNotes?: string;
};

export type ApprovedCourseAddition = {
  country: string;
  name: string;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  holes: number | null;
  website: string | null;
  lat: number;
  lon: number;
  googlePlaceId: string;
  reviewNotes: string | null;
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function optionalText(value: unknown): string | null {
  return text(value) || null;
}

function finiteNumber(value: unknown): number | null {
  const valueText = text(value);
  if (!valueText) return null;
  const parsed = Number(valueText);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCourseAdditionDecision(
  value: unknown,
): CourseAdditionReviewDecision | 'INVALID' {
  const normalized = text(value).toUpperCase();
  if (
    normalized === '' ||
    normalized === 'APPROVE' ||
    normalized === 'REJECT' ||
    normalized === 'REVIEW'
  ) {
    return normalized;
  }
  return 'INVALID';
}

export function parseApprovedCourseAddition(
  row: ReviewedCourseAdditionInput,
  expectedCountry: string,
):
  | { kind: 'approved'; addition: ApprovedCourseAddition }
  | { kind: 'skipped'; decision: CourseAdditionReviewDecision }
  | { kind: 'invalid'; reason: string } {
  const decision = normalizeCourseAdditionDecision(row.reviewDecision);
  if (decision === 'INVALID') {
    return {
      kind: 'invalid',
      reason: `unsupported reviewDecision "${text(row.reviewDecision)}"`,
    };
  }
  if (decision !== 'APPROVE') return { kind: 'skipped', decision };

  const expected = expectedCountry.trim().toUpperCase();
  const country = text(row.country).toUpperCase();
  const name = text(row.name);
  const lat = finiteNumber(row.googleLat);
  const lon = finiteNumber(row.googleLon);
  const holesText = text(row.holes);
  const holes = holesText ? finiteNumber(holesText) : null;
  const website = optionalText(row.website);
  const googlePlaceId = text(row.placeId);

  if (country !== expected) {
    return {
      kind: 'invalid',
      reason: `country mismatch: expected ${expected}, got ${country || '<missing>'}`,
    };
  }
  if (!name) return { kind: 'invalid', reason: 'missing name' };
  if (
    lat === null ||
    lon === null ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return { kind: 'invalid', reason: 'invalid Google coordinates' };
  }
  if (!googlePlaceId) {
    return { kind: 'invalid', reason: 'missing Google Place ID' };
  }
  if (holes !== null && (!Number.isInteger(holes) || holes < 1 || holes > 72)) {
    return { kind: 'invalid', reason: 'invalid holes value' };
  }
  if (website && !/^https?:\/\//i.test(website)) {
    return { kind: 'invalid', reason: 'website must use http or https' };
  }

  return {
    kind: 'approved',
    addition: {
      country,
      name,
      city: optionalText(row.city),
      region: optionalText(row.region),
      postalCode: optionalText(row.postalCode),
      holes,
      website,
      lat,
      lon,
      googlePlaceId,
      reviewNotes: optionalText(row.reviewNotes),
    },
  };
}
