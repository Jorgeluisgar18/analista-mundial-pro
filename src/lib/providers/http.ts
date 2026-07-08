import type { Fetcher } from "@/lib/providers/types";

const DEFAULT_RETRY_STATUSES = new Set([408, 425, 500, 502, 503, 504]);

export interface ResilientFetchOptions extends RequestInit {
  retries?: number;
  retryDelayMs?: number;
  retryStatuses?: Set<number>;
  retryLabel?: string;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryResponse(response: Response, retryStatuses: Set<number>) {
  return retryStatuses.has(response.status);
}

function shouldRetryError(error: unknown) {
  if (!(error instanceof Error)) return true;
  return !/unauthorized|forbidden|invalid api key|api key|subscription/i.test(
    error.message,
  );
}

export async function resilientFetch(
  fetcher: Fetcher,
  input: URL | RequestInfo,
  options: ResilientFetchOptions = {},
) {
  const {
    retries = 1,
    retryDelayMs = 250,
    retryStatuses = DEFAULT_RETRY_STATUSES,
    retryLabel,
    ...requestOptions
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetcher(input, requestOptions);
      if (
        attempt < retries &&
        shouldRetryResponse(response, retryStatuses)
      ) {
        await wait(retryDelayMs * 2 ** attempt);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetryError(error)) break;
      await wait(retryDelayMs * 2 ** attempt);
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : "error de red desconocido";
  throw new Error(
    `${retryLabel ?? "Proveedor externo"} no respondió tras ${retries + 1} intento(s): ${detail}`,
  );
}
