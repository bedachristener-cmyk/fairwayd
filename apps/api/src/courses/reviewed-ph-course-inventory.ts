export type PhDiscoveryRow = {
  recordType: string;
  status: string;
  country: string;
  googleName: string;
  googleBusinessStatus: string;
  placeId: string;
};

export function isPhilippinesCourseInventoryCandidate(
  row: PhDiscoveryRow,
): boolean {
  return (
    row.recordType === 'GOOGLE' &&
    row.country === 'PH' &&
    Boolean(row.placeId.trim())
  );
}
