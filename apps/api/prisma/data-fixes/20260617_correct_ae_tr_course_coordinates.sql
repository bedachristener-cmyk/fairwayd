-- Day 109 Coordinate Correction Batch 1
-- Verified coordinate corrections only. Restrict updates by id, country, and name.

UPDATE "Course"
SET "lat" = 36.86908127879394,
    "lon" = 30.976341906240883,
    "updatedAt" = NOW()
WHERE "id" = 'day108_tr_titanic_golf_club'
  AND "country" = 'TR'
  AND "name" = 'Titanic Golf Club';

UPDATE "Course"
SET "lat" = 24.42048849347294,
    "lon" = 54.52682798329183,
    "updatedAt" = NOW()
WHERE "id" = 'day108_ae_abu_dhabi_golf_club'
  AND "country" = 'AE'
  AND "name" = 'Abu Dhabi Golf Club';

UPDATE "Course"
SET "lat" = 24.478621825878328,
    "lon" = 54.59985349069293,
    "updatedAt" = NOW()
WHERE "id" = 'day108_ae_yas_links_abu_dhabi'
  AND "country" = 'AE'
  AND "name" = 'Yas Links Abu Dhabi';
