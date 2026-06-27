# Auth and Workspace Isolation Decision

## Problem

Manual overrides, saved snapshots and analysis histories are shared unless isolated. Public or multiuser usage needs identity, roles and workspace boundaries.

Without isolation, one analyst could alter match context, provider budgets or saved reports for everyone else. That is acceptable only for a private/single-owner workflow.

## Minimal roles

- Owner: manages workspace, provider settings, imports and billing-sensitive usage limits.
- Analyst: creates overrides, refreshes data and analysis runs.
- Viewer: reads reports only.

## Data requiring workspace ownership

- Manual overrides.
- Analysis runs.
- Export history.
- Provider usage budgets.
- Imported datasets.

## Impacted tables

- MatchSnapshot
- AnalysisRun
- ManualOverride
- ApiUsage
- ProviderTelemetry
- DataSourceSnapshot

`DataSourceSnapshot` is not implemented yet, but future OpenFootball/TheSportsDB imports should be designed with workspace ownership from the start.

## Initial recommendation

Start with a single-owner workspace model before public accounts. Add full auth only when the product moves beyond private use.

The first production-safe version should:

1. Treat provider keys and usage budgets as owner-only settings.
2. Scope manual overrides and analysis runs to one workspace.
3. Make shared reports read-only.
4. Avoid public write access until route guards and ownership checks exist.

## Non-goals for the current private MVP

- Public signup.
- Team invitations.
- Billing plans.
- User-generated public prediction feeds.

These can come later, after workspace ownership is part of the schema and every write route checks authorization.
