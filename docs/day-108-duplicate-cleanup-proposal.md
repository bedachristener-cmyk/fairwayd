# Day 108 Duplicate Cleanup Proposal

Generated from the live local `/api/courses` dataset. Proposal only: do not delete or merge records without a separate data-fix batch.

Selection criteria:
- same country
- same coordinates
- same or near-identical normalized course names

## Top 20 Highest-Confidence Groups

### 1. DE - Golf Club Dresden Elbflorenz
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsfzvqq00i5bkuwfqrdgr8x` - Golf Club Dresden Elbflorenz / Possendorf / Sachsen / 50.9622, 13.7142
- Proposed remove/merge:
  - `cmlsg03mr00s5bkuwmggzjjx8` - Golf Club Dresden-Elbflorenz / Possendorf / Sachsen / holes 18 / access PUBLIC / website https://www.golfclub-dresden.de

### 2. DE - Golf-Club Eifel
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg074400wmbkuwhc64x2uk` - Golf-Club Eifel / Hillesheim / RLP / 50.2822, 6.6742
- Proposed remove/merge:
  - `cmlsg04m000tebkuwcpqnu73l` - Golf Club Eifel / Hillesheim / RLP / holes 18 / access PUBLIC / website https://www.golfclub-eifel.de

### 3. ES - Golf Don Tello
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0fpp017mbkuw8w4nrg0h` - Golf Don Tello / Merida / Extremadura / 38.8417889, -6.3005788
- Proposed remove/merge:
  - `cmlsg0ez5016jbkuwdmo820ir` - Golf de Don Tello / Merida / Extremadura / holes 9 / access PUBLIC / website https://www.dontellogolf.com

### 4. ES - Golf de Meaztegi
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0fcb0172bkuwde4q86q4` - Golf de Meaztegi / Ortuella / Baskenland / 43.288304, -3.062932
- Proposed remove/merge:
  - `cmlsg0hvv01akbkuw4gam18pa` - Meaztegi Golf / Ortuella / Baskenland / holes n/a / access PUBLIC / website https://www.meaztegigolf.eus

### 5. ES - Villa Nueva Golf
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0jn901ctbkuw7ynwcjg1` - Villa Nueva Golf / Puerto Real / Andalusien / 36.5052281, -6.1400996999999995
- Proposed remove/merge:
  - `cmlsg0jo701cubkuwmq3s2n58` - Villa Nueva Golf Resort / Puerto Real / Andalusien / holes 18 / access PUBLIC / website https://www.villanuevagolf.com

### 6. ES - Abra del Pas
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0ddr014ebkuwm8xdxv6b` - Abra del Pas / Mogro / Kantabrien / 43.4415257, -3.9589459
- Proposed remove/merge:
  - `cmlsg0eo30165bkuwlah36sxf` - Golf Abra del Pas / Mogro / Kantabrien / holes 18 / access PUBLIC / website https://www.cantur.com

### 7. ES - Bocigas Golf
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0dup0152bkuwacbult1f` - Bocigas Golf / Bocigas / Kastilien-Leon / 41.229896, -4.6792568
- Proposed remove/merge:
  - `cmlsg0ewi016fbkuwshxqmeyh` - Golf de Bocigas / Bocigas / Kastilien-Leon / holes 9 / access PUBLIC / website https://www.bocigasgolf.com

### 8. ES - Campomar Golf
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0dwr0155bkuwnhrs7e10` - Campomar Golf / Naron / Galizien / 43.5592705, -8.2122573
- Proposed remove/merge:
  - `cmlsg0ex7016gbkuwk36kodwu` - Golf de Campomar / Naron / Galizien / holes 9 / access PUBLIC / website https://www.clubdegolfcampomar.com

### 9. ES - Desert Springs
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0eay015obkuwo0imum02` - Desert Springs / Cuevas del Almanzora / Andalusien / 37.255041299999995, -1.8250077999999998
- Proposed remove/merge:
  - `cmlsg0ebo015pbkuw14wcpzlu` - Desert Springs Resort / Cuevas del Almanzora / Andalusien / holes 18 / access PUBLIC / website https://www.desertspringsresort.es

### 10. ES - Golf Arcos Garden
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0eqb0167bkuwg8wd2xdc` - Golf Arcos Garden / Arcos de la Frontera / Andalusien / 36.7261388, -5.7625449
- Proposed remove/merge:
  - `cmlsg0ev5016dbkuwhvwb9cbn` - Golf de Arcos Garden / Arcos de la Frontera / Andalusien / holes 18 / access PUBLIC / website https://www.arcosgardens.com

### 11. ES - Golf d'Aro Mas Nou
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0etw016bbkuw4kvg25f1` - Golf d'Aro Mas Nou / Platja d'Aro / Katalonien / 41.835980299999996, 3.0184414
- Proposed remove/merge:
  - `cmlsg0eta016abkuw0x0f8vwe` - Golf Club d'Aro Mas Nou / Platja d'Aro / Katalonien / holes 18 / access PUBLIC / website https://www.golfdaro.com

### 12. ES - Golf de Ifach
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0f3y016qbkuwokcywf7h` - Golf de Ifach / Benissa / Valencia / 38.687637699999996, 0.1043799
- Proposed remove/merge:
  - `cmlsg0gy9019bbkuwjvplbhug` - Ifach Golf Club / Benissa / Alicante / holes 9 / access PUBLIC / website https://www.golfifach.com

### 13. ES - Golf de Javea
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0f5f016sbkuwsrqp3549` - Golf de Javea / Xabia / Valencia / 38.745647999999996, 0.1497894
- Proposed remove/merge:
  - `cmlsg0h2a019hbkuwj5ib6s00` - Javea Golf Club / Xabia / Alicante / holes 9 / access PUBLIC / website https://www.clubdegolfjavea.com

### 14. ES - Golf Mudela
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0g9a018cbkuwwdi1xpz5` - Golf Mudela / Santa Cruz de Mudela / Kastilien-La Mancha / 38.641779199999995, -3.4695953999999998
- Proposed remove/merge:
  - `cmlsg0fdj0174bkuwjy7c8zm2` - Golf de Mudela / Santa Cruz / Kastilien-La Mancha / holes 9 / access PUBLIC / website https://www.golfmudela.com

### 15. ES - Golf Pollenca
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0gei018jbkuwfu2komgf` - Golf Pollenca / Pollenca / Mallorca / 39.8576615, 3.0312221
- Proposed remove/merge:
  - `cmlsg0ffm0177bkuwh2o839mr` - Golf de Pollenca / Pollenca / Mallorca / holes 9 / access PUBLIC / website https://www.golfpollensa.com

### 16. ES - Golf Pozoblanco
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0gf8018kbkuwduicumdb` - Golf Pozoblanco / Pozoblanco / Andalusien / 38.3441352, -4.8366815
- Proposed remove/merge:
  - `cmlsg0fg90178bkuwlfczw1ot` - Golf de Pozoblanco / Pozoblanco / Andalusien / holes 9 / access PUBLIC / website https://www.golfpozoblanco.com

### 17. ES - Rotana Golf
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0j0n01c1bkuwuqoejqt8` - Rotana Golf / Manacor / Mallorca / 39.60632400000001, 3.1841573
- Proposed remove/merge:
  - `cmlsg0fgw0179bkuwgaj4rihg` - Golf de Rotana / Manacor / Balearen / holes 9 / access PUBLIC / website https://www.reservarotana.com

### 18. ES - Golf Valdeluz
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0gpo018zbkuw5gzwirj8` - Golf Valdeluz / Yebes / Castilla-La Mancha / 40.5854911, -3.1168199999999997
- Proposed remove/merge:
  - `cmlsg0fkt017fbkuwu4eeciec` - Golf de Valdeluz / Yebes / Kastilien-La Mancha / holes 18 / access PUBLIC / website https://www.golfvaldeluz.com

### 19. ES - Golf La Dehesa
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0fwd017vbkuwwklnsn8x` - Golf La Dehesa / Madrid / Madrid / 40.4501, -3.9816200000000004
- Proposed remove/merge:
  - `cmlsg0h6r019nbkuw266dwqes` - La Dehesa Golf Club / Villanueva de la Canada / Madrid / holes 18 / access PRIVATE / website https://www.golfladehesa.es

### 20. ES - Golf La Envia
- Confidence: High; same country and same coordinates; near-identical normalized name.
- Proposed canonical: `cmlsg0fxq017xbkuwpdgdumhh` - Golf La Envia / Vicar / Andalusien / 36.8382134, -2.6142092999999997
- Proposed remove/merge:
  - `cmlsg0h7g019obkuwblz9mbnx` - La Envia Golf / Vicar / Andalusien / holes 18 / access PUBLIC / website https://www.laenvia.com

## Notes For Next Batch

- This proposal intentionally does not account for posts, reviews, follows, or trip references. A merge batch should inspect related records before deactivating or deleting duplicate courses.
- Prefer deactivation over deletion for the first cleanup pass unless related data is migrated.
- Re-run course counts and map marker checks after any duplicate cleanup.
