export type VnDiscoveryRow = {
  recordType: string;
  status: string;
  country: string;
  googleName: string;
  googleBusinessStatus: string;
  placeId: string;
};

export function isVietnamCourseInventoryCandidate(
  row: VnDiscoveryRow,
): boolean {
  return (
    row.recordType === 'GOOGLE' &&
    row.country === 'VN' &&
    Boolean(row.placeId.trim())
  );
}
