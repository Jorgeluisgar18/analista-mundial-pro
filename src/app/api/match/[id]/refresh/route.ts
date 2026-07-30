import { checkPersistentRateLimit } from "@/lib/http/persistentRateLimit";
import { requireSameOrigin } from "@/lib/http/requestGuards";
import { problem } from "@/lib/http/problem";
import { refreshMatch } from "@/lib/services/refreshService";
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
    "refresh-match",
    {
      limit: 20,
      windowMs: 60_000,
    },
  );
  if (limitProblem) return limitProblem;

  const { id } = await context.params;
  const url = new URL(request.url);
  const bypassCache =
    url.searchParams.get("bypassCache") === "true" ||
    url.searchParams.get("force") === "true";
  let result: Awaited<ReturnType<typeof refreshMatch>>;
  try {
    result = await refreshMatch(id, { bypassCache });
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
  return Response.json(result);
}
