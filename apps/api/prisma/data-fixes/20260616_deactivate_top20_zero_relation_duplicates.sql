-- Day 108 Correction Batch 2
-- Data-only cleanup: deactivate top duplicate course records with zero related
-- posts, reviews, ratings, follows, or trip items at time of audit.
UPDATE "Course"
SET "active" = false,
    "updatedAt" = NOW()
WHERE "id" IN (
  'cmlsg03mr00s5bkuwmggzjjx8',
  'cmlsg04m000tebkuwcpqnu73l',
  'cmlsg0ez5016jbkuwdmo820ir',
  'cmlsg0hvv01akbkuw4gam18pa',
  'cmlsg0jo701cubkuwmq3s2n58',
  'cmlsg0eo30165bkuwlah36sxf',
  'cmlsg0ewi016fbkuwshxqmeyh',
  'cmlsg0ex7016gbkuwk36kodwu',
  'cmlsg0ebo015pbkuw14wcpzlu',
  'cmlsg0ev5016dbkuwhvwb9cbn',
  'cmlsg0eta016abkuw0x0f8vwe',
  'cmlsg0gy9019bbkuwjvplbhug',
  'cmlsg0h2a019hbkuwj5ib6s00',
  'cmlsg0fdj0174bkuwjy7c8zm2',
  'cmlsg0ffm0177bkuwh2o839mr',
  'cmlsg0fg90178bkuwlfczw1ot',
  'cmlsg0fgw0179bkuwgaj4rihg',
  'cmlsg0fkt017fbkuwu4eeciec',
  'cmlsg0h6r019nbkuw266dwqes',
  'cmlsg0h7g019obkuwblz9mbnx'
);
