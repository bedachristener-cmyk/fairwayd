-- Data-only correction: this Argentina course was imported as Spain.
-- No reliable repo source defines a Spanish "Golf de la Sierra de la Ventana".
-- Keep the row for traceability, but hide it from active course/map queries.
UPDATE "Course"
SET "active" = false,
    "updatedAt" = NOW()
WHERE "id" = 'cmlsg0f6p016ubkuw8to19bwb'
  AND "country" = 'ES'
  AND "name" = 'Golf de la Sierra de la Ventana'
  AND "lat" = -38.1420101
  AND "lon" = -61.7938645;
