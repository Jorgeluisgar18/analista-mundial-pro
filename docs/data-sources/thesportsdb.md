# TheSportsDB

TheSportsDB is a secondary enrichment provider. It is not the primary live or last-hour lineup source. Keep API calls server-side and cache aggressively.

Runtime variables:

- `THE_SPORTSDB_API_KEY`
- `THE_SPORTSDB_BASE_URL`
- `THE_SPORTSDB_TIMEOUT_MS`

For the public free v1 plan, TheSportsDB documents key `123`. Keep it in server-side env vars anyway so the app can move to a private key later without changing code.

The free v1 API can return `200` with null roots such as `{ "events": null }`; normalizers must treat that as empty data, not a transport failure.

Operational notes:

- Use it for non-critical enrichment such as teams, events, venues, badges and context.
- Runtime integration is now connected through `TheSportsDbEnrichmentProvider`.
- The enrichment flow uses `eventsday.php` for the match date and `searchteams.php` for home/away teams, then fills missing badges/logos and event venue context.
- If TheSportsDB returns no match/team, the main analysis still works and records an unavailable enrichment source instead of failing the page.
- Do not expose the key through `NEXT_PUBLIC_*`.
- Avoid calling it during user typing or repeated refresh loops.
- The public free key documented by TheSportsDB is useful for development, but production should keep the key server-side like every other provider.
