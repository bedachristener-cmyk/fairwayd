export type AustrianInventoryCourse = {
  regionCode: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  courseDescription: string;
  website: string | null;
};

export type ActiveCourseForInventory = {
  id: string;
  name: string;
  city: string | null;
};

export type AustrianInventoryMatch = {
  inventory: AustrianInventoryCourse;
  status: 'MATCHED' | 'REVIEW';
  matchedCourse: ActiveCourseForInventory | null;
  nameSimilarity: number;
  cityMatch: boolean;
};

const GENERIC_NAME_TOKENS = new Set([
  'golf',
  'golfclub',
  'club',
  'gc',
  'golfanlage',
  'golfplatz',
  'country',
  'landclub',
  'course',
]);

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&auml;/gi, 'ä')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/gi, 'ß')
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHref(cellHtml: string): string | null {
  const match = cellHtml.match(/<a\b[^>]*href=["']([^"']+)["']/i);
  if (!match) return null;
  const href = decodeHtml(match[1]);
  if (!/^https?:\/\//i.test(href)) return null;
  return href;
}

export function parseAustrianCourseInventoryHtml(
  html: string,
): AustrianInventoryCourse[] {
  const courses: AustrianInventoryCourse[] = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(html))) {
    const cells: string[] = [];
    const rawCells: string[] = [];
    const cellPattern = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      rawCells.push(cellMatch[1]);
      cells.push(decodeHtml(cellMatch[1]));
    }

    if (cells.length < 8 || !/^(?:B|K|N|O|S|ST|T|V|W)$/i.test(cells[0])) continue;

    const locationMatch = cells[3].match(/^(\d{4})\s+(.+)$/);
    if (!locationMatch || !cells[1]) continue;

    courses.push({
      regionCode: cells[0].toUpperCase(),
      name: cells[1],
      address: cells[2],
      postalCode: locationMatch[1],
      city: locationMatch[2],
      courseDescription: cells[4],
      website: extractHref(rawCells[7] ?? ''),
    });
  }

  return courses;
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de')
    .replace(/ß/g, 'ss')
    .replace(/&/g, ' und ')
    .replace(/\bst\.?\b/g, 'sankt')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function meaningfulTokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(' ')
      .filter((token) => token && !GENERIC_NAME_TOKENS.has(token)),
  );
}

export function courseInventoryNameSimilarity(
  left: string,
  right: string,
): number {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  if (normalizedLeft === normalizedRight) return 1;

  const leftTokens = meaningfulTokens(left);
  const rightTokens = meaningfulTokens(right);
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection++;
  }
  return intersection / union.size;
}

function cityMatches(inventoryCity: string, databaseCity: string | null): boolean {
  if (!databaseCity) return false;
  const left = normalize(inventoryCity);
  const right = normalize(databaseCity);
  return left === right || left.includes(right) || right.includes(left);
}

export function matchAustrianCourseInventory(
  inventory: AustrianInventoryCourse[],
  activeCourses: ActiveCourseForInventory[],
): AustrianInventoryMatch[] {
  return inventory.map((item) => {
    let bestCourse: ActiveCourseForInventory | null = null;
    let bestSimilarity = 0;
    let bestCityMatch = false;

    for (const course of activeCourses) {
      const similarity = courseInventoryNameSimilarity(item.name, course.name);
      const sameCity = cityMatches(item.city, course.city);
      const currentScore = similarity + (sameCity ? 0.15 : 0);
      const bestScore = bestSimilarity + (bestCityMatch ? 0.15 : 0);

      if (currentScore > bestScore) {
        bestCourse = course;
        bestSimilarity = similarity;
        bestCityMatch = sameCity;
      }
    }

    const exactName =
      bestCourse !== null &&
      normalize(item.name) === normalize(bestCourse.name);
    const matched =
      exactName ||
      (bestCourse !== null && bestCityMatch && bestSimilarity >= 0.72);

    return {
      inventory: item,
      status: matched ? 'MATCHED' : 'REVIEW',
      matchedCourse: bestCourse,
      nameSimilarity: bestSimilarity,
      cityMatch: bestCityMatch,
    };
  });
}
