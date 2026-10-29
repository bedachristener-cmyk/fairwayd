export type MonetizationLinkType = "hotel" | "tee_time";

export type MonetizationProvider = "booking" | "expedia" | "direct";

export type MonetizationLink = {
  type: MonetizationLinkType;
  provider: MonetizationProvider;
  label: string;
  url: string;
};

// 🔒 Feature Toggle (wichtig!)
export const MONETIZATION_ENABLED = false;

// Beispiel Mapping (noch NICHT live)
export function getMonetizationLinksForCourse(
  courseId?: string,
): MonetizationLink[] {
  if (!courseId) return [];

  // später dynamisch aus Backend
  return [];
}

export function getMonetizationLinksForDestination(
  code?: string,
): MonetizationLink[] {
  if (!code) return [];

  switch (code) {
    case "TH":
      return [
        {
          type: "hotel",
          provider: "booking",
          label: "Find hotels near golf courses",
          url: "https://www.booking.com", // später Affiliate Link
        },
      ];

    default:
      return [];
  }
}
