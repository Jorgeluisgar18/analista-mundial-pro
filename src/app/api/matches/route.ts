import { problem } from "@/lib/http/problem";
import { matchService } from "@/lib/services/matchService";
import { isoDateSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = isoDateSchema.safeParse(url.searchParams.get("date"));
  if (!parsed.success) {
    return problem(
      400,
      "Fecha inválida",
      "Usa el formato YYYY-MM-DD.",
      { issues: parsed.error.issues },
    );
  }
  const competition = url.searchParams.get("competition") ?? undefined;
  const result = await matchService.listByDate(parsed.data, competition);
  return Response.json(result);
}
