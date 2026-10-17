const LEGACY_DOCUMENT_KEY = /^trips\/[^/]+\/documents\/[^/]+$/;

export function isLegacyTripDocumentObjectKey(key: string) {
  return LEGACY_DOCUMENT_KEY.test(key);
}
