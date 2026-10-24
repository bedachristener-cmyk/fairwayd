import { BadRequestException } from '@nestjs/common';
import { normalizeReportInput } from './safety-policy';

describe('safety policy', () => {
  it('normalizes a valid report', () => {
    expect(
      normalizeReportInput({
        targetType: 'POST',
        targetId: ' post-1 ',
        reason: 'SPAM',
        details: ' repeated ads ',
      }),
    ).toEqual({
      targetType: 'POST',
      targetId: 'post-1',
      targetUrl: null,
      reason: 'SPAM',
      details: 'repeated ads',
    });
  });

  it('requires a report target', () => {
    expect(() =>
      normalizeReportInput({
        targetType: 'OTHER',
        reason: 'OTHER',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid enum values and URL schemes', () => {
    expect(() =>
      normalizeReportInput({
        targetType: 'USER',
        targetId: 'x',
        reason: 'SPAM',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      normalizeReportInput({
        targetType: 'OTHER',
        targetUrl: 'javascript:alert(1)',
        reason: 'OTHER',
      }),
    ).toThrow(BadRequestException);
  });
});
