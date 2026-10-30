# Thailand entry information in trips

Verified on 30 October 2026 against:
- Thai Immigration Bureau TDAC FAQ: https://tdac.immigration.go.th/manual/en/faq.html
- Thai Embassy London, visa general information: https://london.thaiembassy.org/en/page/visa-general-information
- Thai Ministry of Foreign Affairs e-Visa portal: https://www.thaievisa.go.th/

## Location and audience

Trip → Overview → Before you go → Entry & visas. Available in the ordinary member/organizer view; the existing spectator view still excludes Before you go. The cards are shared app information, not a user's personal checklist state. The local Visa / eVisa checkbox remains independent and does not submit anything to the authorities.

The component displays Thailand information when the trip destination/title mentions Thailand (including translated country names), or an itinerary course identifies its country as Thailand/TH/THA. No airport-code geolocation or nationality inference is attempted. Other destinations do not receive Thailand-specific advice.

## Content and maintenance

Two separate cards:
1. TDAC: complete within the three days before arrival, including the arrival date; arrival is distinct from departure. Official submission is free. Link: https://tdac.immigration.go.th/
2. Visa/e-Visa: individually check nationality, duration and purpose; longer stays may require a visa, but no uniform visa-free duration or processing-time guarantee is asserted. Apply early if required. Link: https://www.thaievisa.go.th/

The TDAC is not a visa and does not replace a required visa. Fairwayd only links out; it does not submit an application, determine admissibility or collect passport details through these cards.

Copy is maintained centrally in `apps/web/src/components/TripEntryRequirements.tsx`, in DE/FR/IT/EN (English fallback for other languages). Update the fixed `checkedOn` date only after checking the official sources again. There is currently no trip-specific entry-information editor. No new reminder, booking, visa application, automatic live update or server-side checklist feature is implied.

Validation: web build; mobile/desktop browser checks cover country matching, exact official links, text/date, the independent local checkbox surviving reload, no mutation calls, exclusion for another country and unchanged spectator boundaries.
