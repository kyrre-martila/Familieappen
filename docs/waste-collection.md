# Waste collection backend

The API owns a provider-neutral `FamilyAddress`, one waste subscription per family, provider fraction metadata, and date-only cached events. The address is intentionally the family's reusable home address so onboarding can later populate or update the same record; onboarding is not changed by this foundation.

Clients use the authenticated, `X-Family-Id` scoped endpoints:

- `GET /api/waste-collection/addresses/search?q=...`
- `PUT /api/waste-collection/subscription`
- `GET /api/waste-collection/subscription`
- `GET /api/waste-collection/events?from=YYYY-MM-DD&to=YYYY-MM-DD`

Creating/updating an enabled subscription performs an initial sync. An hourly worker claims due subscriptions; successful subscriptions are due again after roughly one day and failures after one hour. Syncs only upsert received events and never delete cached future events, so temporary failures and unexpectedly short upstream responses preserve useful data.

`MIN_RENOVASJON_APP_KEY` is required on the API server and must remain secret.

## Calendar follow-up

Calendar aggregation is deliberately deferred. Its current DTO and persistence model represent every event with JavaScript instants (`startsAt`/`endsAt`), which cannot represent the required timezone-independent waste date without violating date-only semantics. The next integration should first add a date-only all-day variant to the calendar domain/DTO, then merge `WasteCollectionEvent.collectionDate` into `CalendarService.listEvents` with source `waste-collection`; it must not create ICS or synthesize midnight UTC timestamps.
