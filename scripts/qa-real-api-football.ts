import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { ApiFootballProvider } from "@/lib/providers/apiFootball";
import type { Fetcher } from "@/lib/providers/types";
import { createQaRequestBudget, validateQaRequestLimit } from "./lib/qaRequestBudget";

export const QA_HELP = `Usage: tsx scripts/qa-real-api-football.ts --date YYYY-MM-DD --competition ID [--competition ID] [--max-requests 20] --allow-live

Requires FOOTBALL_API_KEY in the process environment. Does not load env files.
Counts every API-Football HTTP attempt, including retries, up to a hard cap of 20.
Checks fixture lists and at most one detail per competition. No database writes.
Without --allow-live, no HTTP request is made. --help needs no API key.`;

export function parseQaOptions(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      date: { type: "string" },
      competition: { type: "string", multiple: true },
      "max-requests": { type: "string", default: "20" },
      "allow-live": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) return { help: true as const };
  const date = values.date ?? "";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Provide a valid --date YYYY-MM-DD.");
  }
  const competitions = [...new Set(values.competition ?? [])];
  if (!competitions.length || competitions.some((id) => !/^[a-zA-Z0-9_-]+$/.test(id))) {
    throw new Error("Provide at least one valid --competition ID.");
  }
  const limit = Number(values["max-requests"]);
  validateQaRequestLimit(limit);
  if (!values["allow-live"]) throw new Error("Live QA requires --allow-live.");
  return { help: false as const, date, competitions, limit };
}

export async function runQaRound(
  options: { date: string; competitions: string[]; limit: number },
  apiKey: string,
  fetcher: Fetcher = fetch,
) {
  let transportFailures = 0;
  const observedFetch: Fetcher = async (input, init) => {
    try {
      const response = await fetcher(input, init);
      if (!response.ok) transportFailures += 1;
      return response;
    } catch (error) {
      transportFailures += 1;
      throw error;
    }
  };
  const budget = createQaRequestBudget(observedFetch, options.limit);
  const provider = new ApiFootballProvider(apiKey, budget.fetcher);
  const visited = new Set<string>();
  const checks: Array<{
    competition: string;
    step: string;
    status: string;
    count?: number;
  }> = [];
  for (const competition of options.competitions) {
    if (budget.snapshot().exhausted) {
      checks.push({ competition, step: "list", status: "skipped-budget" });
      continue;
    }
    try {
      const listFailures = transportFailures;
      const list = await provider.listMatches(options.date, competition);
      checks.push({
        competition,
        step: "list",
        status: list.meta.warnings.length || transportFailures > listFailures
          ? "provider-warning"
          : list.data.length ? "available" : "empty",
        count: list.data.length,
      });
      const match = list.data[0];
      if (!match || visited.has(match.id) || budget.snapshot().exhausted) continue;
      visited.add(match.id);
      const detailFailures = transportFailures;
      const detail = await provider.getMatch(match.id);
      checks.push({
        competition,
        step: "detail",
        status: transportFailures > detailFailures
          ? "provider-warning"
          : detail.data ? "available" : "unavailable",
      });
    } catch {
      // Provider messages may contain response bodies; publish only safe states.
      checks.push({
        competition,
        step: "request",
        status: budget.snapshot().exhausted ? "budget-exhausted" : "failed",
      });
    }
  }
  return { date: options.date, budget: budget.snapshot(), checks };
}

export function qaExitCode(report: Awaited<ReturnType<typeof runQaRound>>) {
  return report.budget.exhausted ||
    report.checks.some((check) => !["available", "empty"].includes(check.status))
    ? 1 : 0;
}

async function main() {
  try {
    const options = parseQaOptions(process.argv.slice(2));
    if (options.help) {
      console.log(QA_HELP);
      return;
    }
    const apiKey = process.env.FOOTBALL_API_KEY;
    if (!apiKey) {
      throw new Error("FOOTBALL_API_KEY must be supplied in the process environment.");
    }
    const report = await runQaRound(options, apiKey);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = qaExitCode(report);
  } catch {
    console.error("QA did not complete. Check date, competition, limit, explicit live opt-in, and process credentials. Use --help for details.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
