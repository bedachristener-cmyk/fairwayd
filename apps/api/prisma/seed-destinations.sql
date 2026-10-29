INSERT INTO "Destination" ("id", "code", "name", "slug", "description", "coverImage", "isActive", "createdAt", "updatedAt")
VALUES
  ('th', 'TH', 'Thailand', 'thailand', NULL, NULL, true, NOW(), NOW()),
  ('vn', 'VN', 'Vietnam', 'vietnam', NULL, NULL, true, NOW(), NOW()),
  ('pt', 'PT', 'Portugal', 'portugal', NULL, NULL, true, NOW(), NOW()),
  ('es', 'ES', 'Spain', 'spain', NULL, NULL, true, NOW(), NOW()),
  ('tr', 'TR', 'Turkey', 'turkey', NULL, NULL, true, NOW(), NOW()),
  ('ae', 'AE', 'United Arab Emirates', 'united-arab-emirates', NULL, NULL, true, NOW(), NOW()),
  ('ch', 'CH', 'Switzerland', 'switzerland', NULL, NULL, true, NOW(), NOW()),
  ('de', 'DE', 'Germany', 'germany', NULL, NULL, true, NOW(), NOW()),
  ('at', 'AT', 'Austria', 'austria', NULL, NULL, true, NOW(), NOW()),
  ('fr', 'FR', 'France', 'france', NULL, NULL, true, NOW(), NOW()),
  ('it', 'IT', 'Italy', 'italy', NULL, NULL, true, NOW(), NOW()),
  ('jp', 'JP', 'Japan', 'japan', NULL, NULL, true, NOW(), NOW()),
  ('ph', 'PH', 'Philippines', 'philippines', NULL, NULL, true, NOW(), NOW()),
  ('us', 'US', 'United States', 'united-states', NULL, NULL, true, NOW(), NOW()),
  ('za', 'ZA', 'South Africa', 'south-africa', NULL, NULL, true, NOW(), NOW())
ON CONFLICT ("code")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "slug" = EXCLUDED."slug",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();
