import type { Fetcher } from "@/lib/providers/types";

export const MAX_QA_REQUESTS = 20;

export function validateQaRequestLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QA_REQUESTS) {
    throw new Error("QA request limit must be an integer from 1 to 20.");
  }
}

export function createQaRequestBudget(
  fetcher: Fetcher = fetch,
  limit = MAX_QA_REQUESTS,
) {
  validateQaRequestLimit(limit);

  let attempts = 0;
  const boundedFetch: Fetcher = async (input, init) => {
    if (attempts >= limit) throw new Error("QA request budget exhausted.");
    // Reserve before dispatch, with no await between the check and increment.
    attempts += 1;
    return fetcher(input, { ...init, redirect: "error" });
  };

  return {
    fetcher: boundedFetch,
    snapshot: () => ({
      attempts,
      limit,
      remaining: limit - attempts,
      exhausted: attempts >= limit,
    }),
  };
}
