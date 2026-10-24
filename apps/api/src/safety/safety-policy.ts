import { BadRequestException } from '@nestjs/common';
import { ReportReason, ReportTargetType } from '@prisma/client';

const TARGET_TYPES = new Set(Object.values(ReportTargetType));
const REASONS = new Set(Object.values(ReportReason));

export function normalizeReportInput(input: {
  targetType?: unknown;
  targetId?: unknown;
  targetUrl?: unknown;
  reason?: unknown;
  details?: unknown;
}) {
  if (
    typeof input.targetType !== 'string' ||
    !TARGET_TYPES.has(input.targetType as ReportTargetType)
  ) {
    throw new BadRequestException('Invalid report target type');
  }
  if (
    typeof input.reason !== 'string' ||
    !REASONS.has(input.reason as ReportReason)
  ) {
    throw new BadRequestException('Invalid report reason');
  }

  const targetId =
    typeof input.targetId === 'string' ? input.targetId.trim().slice(0, 120) : '';
  const targetUrl =
    typeof input.targetUrl === 'string'
      ? input.targetUrl.trim().slice(0, 500)
      : '';
  const details =
    typeof input.details === 'string'
      ? input.details.trim().slice(0, 1000)
      : '';

  if (!targetId && !targetUrl) {
    throw new BadRequestException('A target id or URL is required');
  }

  if (targetUrl) {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl, 'https://fairwayd.app');
    } catch {
      throw new BadRequestException('Invalid report URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Invalid report URL');
    }
  }

  return {
    targetType: input.targetType as ReportTargetType,
    targetId: targetId || null,
    targetUrl: targetUrl || null,
    reason: input.reason as ReportReason,
    details: details || null,
  };
}
