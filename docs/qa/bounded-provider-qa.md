# Bounded API-Football QA

This local runner checks fixture lists and at most one detail per competition.
It does not load `.env` files, use Neon, modify application data, or deploy.
It is a transport/availability check, not proof of accurate predictions or complete
lineup/odds coverage. Visual QA and the wider provider matrix remain separate.

## Before live execution

1. Obtain explicit authorization for API-Football, the process credential to use,
   the date/competitions, and the remaining request allowance.
2. Use Node 22 and the already installed project dependencies.
3. Supply `FOOTBALL_API_KEY` securely in the process environment. Never put its
   value in command arguments, committed files, screenshots, or QA reports.
4. Do not run another live runner, application server, or import job against the
   same QA allowance concurrently.

Inspect usage without credentials or HTTP requests:

```powershell
node --import tsx scripts/qa-real-api-football.ts --help
```

Only after explicit authorization, one example invocation is:

```powershell
node --import tsx scripts/qa-real-api-football.ts --date 2026-10-24 --competition all --max-requests 20 --allow-live
```

Use `--competition` more than once for one shared round. A lower
`--max-requests` is supported; values above 20 are rejected. Date selection uses
the application's existing Colombia-time provider query.

## What the cap means

Each underlying HTTP attempt is reserved synchronously before dispatch. HTTP
errors, network failures, and retries consume allowance. Once exhausted, later
attempts are refused locally without calling the underlying transport. Lists,
details, and their internal parallel requests share the same budget.
Automatic redirects are rejected so they cannot issue uncounted requests or
forward the credential to another destination.

The cap covers **one runner process**, not the provider account or other
processes. Restarting the command starts a new round: do not rerun under the same
authorization without subtracting previously attempted requests and obtaining
the required authorization. Count attempts conservatively, even if a request may
not have reached the provider.

The JSON summary includes only the date, attempt budget, competition filter,
check stage, availability state, and fixture count. Raw provider errors,
credential headers, and API keys are not printed. HTTP errors and network failures mark the
affected check as `provider-warning`, even when a retry or provider fallback
returns data; this runner conservatively requires a clean transport round.
Unattempted competition lists
are explicitly marked `skipped-budget`. `provider-warning`, `failed`,
`unavailable`, `skipped-budget`, or an exhausted budget cause exit code 1. A successful empty list
is reported as `empty`, not as a coverage guarantee.

## Mocked regression checks

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/qa-request-budget.test.ts tests/unit/provider-http.test.ts
```

These tests do not spend provider quota. Live validation remains pending until
authorized and observed; a passing mocked suite must not be reported as live QA.
