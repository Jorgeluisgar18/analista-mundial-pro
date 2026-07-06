# Footballdata.io

Footballdata.io is a separate provider from Football-Data.org. Do not reuse `FOOTBALL_DATA_API_KEY` for it.

Runtime variables:

- `FOOTBALLDATA_IO_API_KEY`
- `FOOTBALLDATA_IO_BASE_URL` defaults to `https://footballdata.io/api/v1`

Operational notes:

- Authentication uses `Authorization: Bearer <token>`.
- Runtime integration uses `/matches/date/{YYYY-MM-DD}` as a calendar fallback.
- Detail integration uses `/matches/{match_id}` and attempts `/matches/{match_id}/stats` plus `/matches/{match_id}/probabilities`.
- If stats/probabilities are not available on the free plan, the provider still returns an analyzable dataset with explicit unavailable sources and conservative priors.
- Usage is tracked as a monthly quota when the provider returns request metadata.
- `matchService` protects a monthly reserve before calling this provider when local usage telemetry is available.
- Keep calls server-side and prefer cache/snapshots before repeated QA searches.
