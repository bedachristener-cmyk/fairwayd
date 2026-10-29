export type CoordinateReviewDecision =
  | 'APPROVE'
  | 'KEEP'
  | 'REJECT'
  | 'REVIEW'
  | '';

export type ReviewedCoordinateInput = {
  id?: string;
  country?: string;
  name?: string;
  currentLat?: string;
  currentLon?: string;
  googleLat?: string;
  googleLon?: string;
  reviewDecision?: string;
};

export type ApprovedCoordinateChange = {
  id: string;
  country: string;
  name: string;
  currentLat: number;
  currentLon: number;
  newLat: number;
  newLon: number;
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function number(value: unknown): number | null {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCoordinateReviewDecision(
  value: unknown,
): CoordinateReviewDecision | 'INVALID' {
  const normalized = text(value).toUpperCase();
  if (
    normalized === '' ||
    normalized === 'APPROVE' ||
    normalized === 'KEEP' ||
    normalized === 'REJECT' ||
    normalized === 'REVIEW'
  ) {
    return normalized;
  }
  return 'INVALID';
}

export function parseApprovedCoordinateChange(
  row: ReviewedCoordinateInput,
  expectedCountry: string,
):
  | { kind: 'approved'; change: ApprovedCoordinateChange }
  | { kind: 'skipped'; decision: CoordinateReviewDecision }
  | { kind: 'invalid'; reason: string } {
  const decision = normalizeCoordinateReviewDecision(row.reviewDecision);
  if (decision === 'INVALID') {
    return {
      kind: 'invalid',
      reason: `unsupported reviewDecision "${text(row.reviewDecision)}"`,
    };
  }
  if (decision !== 'APPROVE') {
    return { kind: 'skipped', decision };
  }

  const id = text(row.id);
  const country = text(row.country).toUpperCase();
  const name = text(row.name);
  const currentLat = number(row.currentLat);
  const currentLon = number(row.currentLon);
  const newLat = number(row.googleLat);
  const newLon = number(row.googleLon);

  if (!id) return { kind: 'invalid', reason: 'missing id' };
  if (!name) return { kind: 'invalid', reason: 'missing name' };
  if (country !== expectedCountry.toUpperCase()) {
    return {
      kind: 'invalid',
      reason: `country mismatch: expected ${expectedCountry}, got ${country || '<missing>'}`,
    };
  }
  if (currentLat === null || currentLon === null) {
    return { kind: 'invalid', reason: 'invalid current coordinates' };
  }
  if (
    newLat === null ||
    newLon === null ||
    newLat < -90 ||
    newLat > 90 ||
    newLon < -180 ||
    newLon > 180
  ) {
    return { kind: 'invalid', reason: 'invalid Google coordinates' };
  }

  return {
    kind: 'approved',
    change: {
      id,
      country,
      name,
      currentLat,
      currentLon,
      newLat,
      newLon,
    },
  };
}
