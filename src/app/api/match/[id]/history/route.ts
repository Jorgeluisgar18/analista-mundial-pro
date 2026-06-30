import { prisma } from "@/lib/db/prisma";
import { getDemoDatasetById } from "@/data/demo";
import { problem } from "@/lib/http/problem";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (getDemoDatasetById(id)) {
    return Response.json({ analyses: [], overrides: [] });
  }
  const match = await prisma.match.findUnique({ where: { externalId: id } });
  if (!match) return problem(404, "Partido no encontrado", id);
  const [analyses, overrides] = await Promise.all([
    prisma.analysisRun.findMany({
      where: { matchId: match.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        manuallyUpdated: true,
        inputHash: true,
      },
    }),
    prisma.manualOverride.findMany({
      where: { matchId: match.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return Response.json({ analyses, overrides });
}
