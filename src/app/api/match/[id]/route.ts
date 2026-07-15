import { problem } from "@/lib/http/problem";
import { isMatchProviderUnavailableError } from "@/lib/services/matchService";
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
