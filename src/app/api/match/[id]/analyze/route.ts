import { checkRateLimit } from "@/lib/http/rateLimit";
import { requireSameOrigin } from "@/lib/http/requestGuards";
import { problem } from "@/lib/http/problem";
import { getAnalysis } from "@/lib/services/analysisService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originProblem = requireSameOrigin(request);
  if (originProblem) return originProblem;
  const limitProblem = checkRateLimit(request, "analyze-match", {
    limit: 30,
    windowMs: 60_000,
  });
  if (limitProblem) return limitProblem;

  const { id } = await context.params;
  const result = await getAnalysis(id);
  if (!result) return problem(404, "Partido no encontrado", id);
  return Response.json(result.analysis);
}
