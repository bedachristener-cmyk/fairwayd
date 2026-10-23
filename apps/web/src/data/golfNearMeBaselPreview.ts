import type { GolfServiceCategory, GolfServiceVenue } from "../api/golfServices";

// Developer-only UI preview, transcribed from the review-only Basel pilot fixture:
// apps/api/scripts/fixtures/ch-basel-golf-services-pilot.json
// DRAFT, NOT verified, NOT geocoded. Never use as a public API result or seed.
export const BASEL_PILOT_VENUE: GolfServiceVenue = {
  id: "preview-ch-rheinfelden-the-golf-lounge",
  name: "The Golf Lounge",
  country: "CH",
  region: "Aargau",
  city: "Rheinfelden",
  addressLine: "Quellenstrasse 37",
  postalCode: "4310",
  lat: null,
  lon: null,
  website: "https://thegolflounge.ch/",
  phone: null,
  distanceKm: null,
  offerings: [
    {
      id: "preview-simulator",
      category: "SIMULATOR",
      label: "Indoor golf simulators",
      description: null,
      unitCount: 2,
      availableToPublic: null,
      bookingUrl: null,
    },
    {
      id: "preview-academy",
      category: "ACADEMY",
      label: "Golf lessons with Sebby",
      description: null,
      unitCount: null,
      availableToPublic: null,
      bookingUrl: null,
    },
    {
      id: "preview-shop",
      category: "SHOP",
      label: "Proshop",
      description: null,
      unitCount: null,
      availableToPublic: null,
      bookingUrl: null,
    },
    {
      id: "preview-fitting",
      category: "FITTING",
      label: "Custom club fitting",
      description: null,
      unitCount: null,
      availableToPublic: null,
      bookingUrl: null,
    },
  ],
  venueProviders: [
    {
      role: "GOLF_PRO",
      provider: {
        id: "preview-sebbygolf",
        name: "SebbyGolf",
        kind: "PERSON",
        website: null,
      },
    },
  ],
};

export function baselPilotPreview(category: GolfServiceCategory | ""): GolfServiceVenue[] {
  const offerings = category
    ? BASEL_PILOT_VENUE.offerings.filter((offering) => offering.category === category)
    : BASEL_PILOT_VENUE.offerings;

  return offerings.length > 0
    ? [{ ...BASEL_PILOT_VENUE, offerings }]
    : [];
}
