import { renderAnalysisHtml } from "@/lib/export/renderAnalysisHtml";
import { problem } from "@/lib/http/problem";
import { getAnalysis } from "@/lib/services/analysisService";
import { isMatchProviderUnavailableError } from "@/lib/services/matchService";

function safeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

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
  if (!result) return problem(404, "Partido no encontrado", id);
  const html = renderAnalysisHtml(result.analysis, result.dataset);
  const fileName = `${safeName(result.analysis.match.homeTeam.name)}-vs-${safeName(result.analysis.match.awayTeam.name)}.html`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
}
