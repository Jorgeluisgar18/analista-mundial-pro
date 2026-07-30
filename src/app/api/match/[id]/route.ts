import { problem } from "@/lib/http/problem";
import { isMatchProviderUnavailableError } from "@/lib/services/matchService";
import { isProductionDataUnavailableError } from "@/lib/runtime/productionPolicy";
import { productionDataProblem } from "@/lib/http/productionDataProblem";
import { getAnalysis } from "@/lib/services/analysisService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let result: Awaited<ReturnType<typeof getAnalysis>>;
  try {
    result = await getAnalysis(id, { persist: false });
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
  if (!result) {
    return problem(404, "Partido no encontrado", `No existe el partido ${id}.`);
  }
  return Response.json(result);
}
