import { fileUrl } from "../api/fileUrl";
import { DESTINATION_INFO } from "../data/destinationInfo";

export type CourseHeroSource =
  | "real"
  | "ai-fallback"
  | "destination-fallback";

export type CourseHeroImage = {
  url: string;
  source: CourseHeroSource;
};

type CourseWithCountry = { country?: string | null } | null;
type PostWithImages = { images?: { url?: string | null }[] | null };

const DESTINATION_KEY_BY_COUNTRY_CODE: Record<string, string> = {
  AT: "austria",
  DE: "germany",
  ES: "spain",
  FR: "france",
  IT: "italy",
  JP: "japan",
  PH: "philippines",
  PT: "portugal",
  TH: "thailand",
  TR: "turkey",
  US: "united-states",
  ZA: "south-africa",
  CH: "switzerland",
};

function slugifyDestinationKey(value?: string | null) {
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveCourseHeroImage(
  course: CourseWithCountry,
  posts: PostWithImages[],
): CourseHeroImage {
  const postImage = posts
    .flatMap((post) => post.images ?? [])
    .map((image) => fileUrl(image.url))
    .find(Boolean);

  if (postImage) return { url: postImage, source: "real" };

  const countryCode = course?.country?.trim().toUpperCase() ?? "";
  const destinationKey =
    DESTINATION_KEY_BY_COUNTRY_CODE[countryCode] ??
    slugifyDestinationKey(course?.country);
  const destination = destinationKey ? DESTINATION_INFO[destinationKey] : null;
  const url =
    destination?.heroImage ??
    destination?.galleryImages?.find((image) => image.src)?.src ??
    "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1600&q=78";

  return {
    url,
    source: destination?.heroImageSource === "ai-fallback"
      ? "ai-fallback"
      : "destination-fallback",
  };
}
