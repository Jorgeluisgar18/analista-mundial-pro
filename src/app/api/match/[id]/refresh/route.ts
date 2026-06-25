import { problem } from "@/lib/http/problem";
import { refreshMatch } from "@/lib/services/refreshService";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await refreshMatch(id);
  if (!result) return problem(404, "Partido no encontrado", id);
  return Response.json(result);
}
