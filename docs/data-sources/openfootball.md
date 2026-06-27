# OpenFootball

OpenFootball is an offline historical/import source. It is useful for World Cup structure, historical fixtures, league seasons and backtesting. It is not a live source for injuries, confirmed lineups, odds, referees or last-hour updates.

Rules:

- Do not fetch GitHub Raw during user requests.
- Import from a local ignored cache under `data/openfootball/`.
- Store repo, source path, commit SHA and import timestamp.
- Keep runtime data traceable back to the original file.

Suggested local layout:

```text
data/openfootball/
  football.json/
  worldcup.json/
```

Validation:

```bash
tsx scripts/validate-openfootball.ts
```

Import foundation smoke:

```bash
OPENFOOTBALL_SOURCE_FILE=data/openfootball/worldcup.json/2026/worldcup.json tsx scripts/import-openfootball.ts
```
