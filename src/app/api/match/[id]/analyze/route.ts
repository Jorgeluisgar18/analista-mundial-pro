import { checkPersistentRateLimit } from "@/lib/http/persistentRateLimit";
import { requireSameOrigin } from "@/lib/http/requestGuards";
import { problem } from "@/lib/http/problem";
import { getAnalysis } from "@/lib/services/analysisService";
import { isMatchProviderUnavailableError } from "@/lib/services/matchService";
import { isProductionDataUnavailableError } from "@/lib/runtime/productionPolicy";
import { productionDataProblem } from "@/lib/http/productionDataProblem";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originProblem = requireSameOrigin(request);
  if (originProblem) return originProblem;
  const limitProblem = await checkPersistentRateLimit(
    request,
    "analyze-match",
    {
      limit: 30,
      windowMs: 60_000,
    },
  );
  if (limitProblem) return limitProblem;

  const { id } = await context.params;
  let result: Awaited<ReturnType<typeof getAnalysis>>;
  try {
    result = await getAnalysis(id);
  } catch (error) {
    if (isProductionDataUnavailableError(error)) {
      return productionDataProblem(error);
    }
    if (isMatchProviderUnavailableError(error)) {
      return problem(
        503,
        "Proveedor temporalmente no disponible",
        `No fue posible consultar ${error.providerId}. Intenta de nuevo o usa cache/datos complementarios.`,
      );
    }
    throw error;
  }
  if (!result) return problem(404, "Partido no encontrado", id);
  return Response.json(result.analysis);
}
