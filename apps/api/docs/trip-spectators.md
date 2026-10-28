# Trip spectators

Organizers add a registered account with role VIEWER (shown as Spectator / read only). Guests cannot be spectators. Existing participants cannot be converted to spectators because they may already have financial allocations; spectator-to-participant promotion is supported.

VIEWER can read its own trip list and a restricted itinerary from GET /trips/:id. Only GROUP itinerary items are returned, with an explicit field allowlist. Notes, booking references, costs, participants, private/selected items and documents are excluded. The spectator page links to the normal Feed; following and post visibility rules remain unchanged.

All other member-level Trip service operations reject VIEWER through the common membership check; organizer operations already require OWNER or ADMIN. Document upload preflight, metadata/file retrieval, costs, trip activity and item mutations remain protected on the server.

Spectators are returned separately from participants for organizer membership management. Participant/payer queries and shared defaults exclude VIEWER, as do cost summaries and invite participant counts. No schema migration is needed: VIEWER already exists in TripRole.

Verification: spectator service tests cover allowlisting, restricted routes, organizer additions, invalid guests, conversion restrictions and financial participant/payer queries. Browser tests cover read-only itinerary display and absence of protected-feature requests at mobile and desktop widths. Existing Trip document browser tests also run in CI.
