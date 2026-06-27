# TheSportsDB

TheSportsDB is a secondary enrichment provider. It is not the primary live or last-hour lineup source. Keep API calls server-side and cache aggressively.

Runtime variables:

- `THE_SPORTSDB_API_KEY`
- `THE_SPORTSDB_BASE_URL`
- `THE_SPORTSDB_TIMEOUT_MS`

The free v1 API can return `200` with null roots such as `{ "events": null }`; normalizers must treat that as empty data, not a transport failure.

Operational notes:

- Use it for non-critical enrichment such as teams, events, venues, badges and context.
- Do not expose the key through `NEXT_PUBLIC_*`.
- Avoid calling it during user typing or repeated refresh loops.
- The public free key documented by TheSportsDB is useful for development, but production should keep the key server-side like every other provider.
