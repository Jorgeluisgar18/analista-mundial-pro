import { problem } from "@/lib/http/problem";

interface RateLimitBucket {
  count: number;
  resetsAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export function clientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function checkRateLimit(
  request: Request,
  scope: string,
  {
    limit = 20,
    windowMs = 60_000,
  }: {
    limit?: number;
    windowMs?: number;
  } = {},
) {
  const now = Date.now();
  const key = `${scope}:${clientAddress(request)}`;
  const current = buckets.get(key);
  const bucket =
    !current || current.resetsAt <= now
      ? { count: 0, resetsAt: now + windowMs }
      : current;

  if (bucket.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000));
    const response = problem(
      429,
      "Demasiadas solicitudes",
      "Espera antes de volver a intentar esta operación.",
    );
    response.headers.set("retry-after", String(retryAfter));
    response.headers.set("x-ratelimit-limit", String(limit));
    response.headers.set("x-ratelimit-remaining", "0");
    return response;
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return null;
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
