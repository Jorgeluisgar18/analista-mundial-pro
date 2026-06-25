import { problem } from "@/lib/http/problem";
import { getAnalysis } from "@/lib/services/analysisService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await getAnalysis(id);
  if (!result) {
    return problem(404, "Partido no encontrado", `No existe el partido ${id}.`);
  }
  return Response.json(result);
}
