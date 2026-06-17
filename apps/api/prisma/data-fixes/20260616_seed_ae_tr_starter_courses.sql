-- Day 108 Correction Batch 3: starter course sets for zero-course V1 destinations.
-- Small, reversible data-only seed. Keeps existing matching rows active and avoids duplicates
-- through the existing Course(country, name, lat, lon) unique import key.

INSERT INTO "Course" (
  "id",
  "name",
  "country",
  "region",
  "city",
  "lat",
  "lon",
  "holes",
  "access",
  "website",
  "source",
  "verified",
  "active",
  "createdAt",
  "updatedAt"
) VALUES
  ('day108_ae_emirates_golf_club', 'Emirates Golf Club', 'AE', 'Dubai', 'Dubai', 25.0849, 55.1608, 36, 'RESORT', 'https://www.dubaigolf.com/emirates-golf-club/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_ae_jumeirah_golf_estates', 'Jumeirah Golf Estates', 'AE', 'Dubai', 'Dubai', 25.0188, 55.2131, 36, 'RESORT', 'https://www.jumeirahgolfestates.com/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_ae_dubai_creek_golf_yacht_club', 'Dubai Creek Golf & Yacht Club', 'AE', 'Dubai', 'Dubai', 25.2424, 55.3330, 18, 'RESORT', 'https://www.dubaigolf.com/dubai-creek-golf-yacht-club/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_ae_the_els_club_dubai', 'The Els Club Dubai', 'AE', 'Dubai', 'Dubai', 25.0369, 55.2402, 18, 'RESORT', 'https://www.elsclubdubai.com/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_ae_trump_international_golf_club_dubai', 'Trump International Golf Club Dubai', 'AE', 'Dubai', 'Dubai', 25.0210, 55.2603, 18, 'RESORT', 'https://www.trumpgolfdubai.com/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_ae_arabian_ranches_golf_club', 'Arabian Ranches Golf Club', 'AE', 'Dubai', 'Dubai', 25.0509, 55.2664, 18, 'RESORT', 'https://www.arabianranchesgolfdubai.com/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_ae_yas_links_abu_dhabi', 'Yas Links Abu Dhabi', 'AE', 'Abu Dhabi', 'Abu Dhabi', 24.4670, 54.6068, 18, 'RESORT', 'https://www.viyagolf.com/yas-links', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_ae_abu_dhabi_golf_club', 'Abu Dhabi Golf Club', 'AE', 'Abu Dhabi', 'Abu Dhabi', 24.4040, 54.5688, 27, 'RESORT', 'https://www.viyagolf.com/abu-dhabi-golf-club', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_ae_saadiyat_beach_golf_club', 'Saadiyat Beach Golf Club', 'AE', 'Abu Dhabi', 'Abu Dhabi', 24.5431, 54.4357, 18, 'RESORT', 'https://www.viyagolf.com/saadiyat-beach-golf-club', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_carya_golf_club', 'Carya Golf Club', 'TR', 'Belek', 'Belek', 36.8639, 31.0032, 18, 'RESORT', 'https://www.caryagolf.com/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_montgomerie_maxx_royal', 'Montgomerie Maxx Royal', 'TR', 'Belek', 'Belek', 36.8489, 31.0701, 18, 'RESORT', 'https://www.maxxroyal.com/en/belek-golf-resort/golf', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_antalya_golf_club_pga_sultan', 'Antalya Golf Club PGA Sultan', 'TR', 'Belek', 'Belek', 36.8588, 31.0132, 18, 'RESORT', 'https://www.antalyagolfclub.com.tr/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_antalya_golf_club_pasha', 'Antalya Golf Club Pasha', 'TR', 'Belek', 'Belek', 36.8580, 31.0148, 18, 'RESORT', 'https://www.antalyagolfclub.com.tr/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_national_golf_club', 'National Golf Club', 'TR', 'Belek', 'Belek', 36.8618, 31.0189, 18, 'RESORT', 'https://www.nationalturkey.com/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_gloria_golf_club', 'Gloria Golf Club', 'TR', 'Belek', 'Belek', 36.8516, 31.0898, 45, 'RESORT', 'https://www.gloria.com.tr/golf/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_cornelia_golf_club', 'Cornelia Golf Club', 'TR', 'Belek', 'Belek', 36.8613, 31.0538, 27, 'RESORT', 'https://www.corneliagolfclub.com/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_kaya_palazzo_golf_club', 'Kaya Palazzo Golf Club', 'TR', 'Belek', 'Belek', 36.8632, 31.0244, 18, 'RESORT', 'https://www.kayapalazzogolfclub.com/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_sueno_golf_club', 'Sueno Golf Club', 'TR', 'Belek', 'Belek', 36.8617, 31.0406, 36, 'RESORT', 'https://www.sueno.com.tr/golf/', 'day108_starter_seed', true, true, NOW(), NOW()),
  ('day108_tr_titanic_golf_club', 'Titanic Golf Club', 'TR', 'Belek', 'Belek', 36.8522, 31.0349, 27, 'RESORT', 'https://www.titanic.com.tr/titanic-deluxe-golf-belek/golf', 'day108_starter_seed', true, true, NOW(), NOW())
ON CONFLICT ("country", "name", "lat", "lon") DO UPDATE SET
  "region" = EXCLUDED."region",
  "city" = EXCLUDED."city",
  "holes" = EXCLUDED."holes",
  "access" = EXCLUDED."access",
  "website" = EXCLUDED."website",
  "source" = EXCLUDED."source",
  "verified" = EXCLUDED."verified",
  "active" = true,
  "updatedAt" = NOW();
