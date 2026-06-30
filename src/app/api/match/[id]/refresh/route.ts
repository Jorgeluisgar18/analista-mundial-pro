import { checkRateLimit } from "@/lib/http/rateLimit";
import { requireSameOrigin } from "@/lib/http/requestGuards";
import { problem } from "@/lib/http/problem";
import { refreshMatch } from "@/lib/services/refreshService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originProblem = requireSameOrigin(request);
  if (originProblem) return originProblem;
  const limitProblem = checkRateLimit(request, "refresh-match", {
    limit: 20,
    windowMs: 60_000,
  });
  if (limitProblem) return limitProblem;

  const { id } = await context.params;
  const url = new URL(request.url);
  const bypassCache =
    url.searchParams.get("bypassCache") === "true" ||
    url.searchParams.get("force") === "true";
  const result = await refreshMatch(id, { bypassCache });
  if (!result) return problem(404, "Partido no encontrado", id);
  return Response.json(result);
}
