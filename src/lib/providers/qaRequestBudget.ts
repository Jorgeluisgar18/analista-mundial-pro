import type { Fetcher } from "@/lib/providers/types";

interface QaBudget {
  attempts: number;
  limit: number;
}

const runtime = globalThis as typeof globalThis & {
  __analistaApiFootballQaBudget?: QaBudget;
};

export function apiFootballQaFetcher(fetcher: Fetcher, configuredLimit?: string): Fetcher {
  const configured = configuredLimit?.trim();
  let budget = runtime.__analistaApiFootballQaBudget;
  if (!configured && !budget) return fetcher;

  if (configured) {
    const limit = Number(configured);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new Error("QA request limit must be an integer from 1 to 20.");
    }
    if (budget && budget.limit !== limit) {
      throw new Error("QA request limit cannot change during the current pass.");
    }
    budget ??= { attempts: 0, limit };
    runtime.__analistaApiFootballQaBudget = budget;
  }

  const activeBudget = budget!;
  return async (input, init) => {
    if (activeBudget.attempts >= activeBudget.limit) {
      throw new Error("API-Football QA request budget exhausted; no HTTP request sent.");
    }

    // Reserve synchronously before any await so concurrent callers share the cap.
    activeBudget.attempts += 1;
    console.info("API-Football QA", {
      pid: process.pid,
      attempts: activeBudget.attempts,
      limit: activeBudget.limit,
      remaining: activeBudget.limit - activeBudget.attempts,
    });
    return fetcher(input, { ...init, redirect: "error" });
  };
}
