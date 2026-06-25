import { prisma } from "@/lib/db/prisma";
import { problem } from "@/lib/http/problem";
import { getAnalysis } from "@/lib/services/analysisService";
import { manualOverrideSchema } from "@/lib/validation/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problem(
      400,
      "JSON inválido",
      "El cuerpo de la solicitud debe contener JSON válido.",
    );
  }
  const parsed = manualOverrideSchema.safeParse(payload);
  if (!parsed.success) {
    return problem(400, "Cambio inválido", "Revisa los campos enviados.", {
      issues: parsed.error.issues,
    });
  }
  const match = await prisma.match.findUnique({ where: { externalId: id } });
  if (!match) return problem(404, "Partido no encontrado", id);
  const override = await prisma.manualOverride.create({
    data: {
      matchId: match.id,
      type: parsed.data.type,
      description: parsed.data.description,
      sourceUrl: parsed.data.sourceUrl || null,
      teamId: parsed.data.teamId || null,
      player: parsed.data.player || null,
      impact: parsed.data.impact || null,
      area: parsed.data.area || null,
      value: parsed.data.value || null,
      observedAt: parsed.data.observedAt
        ? new Date(parsed.data.observedAt)
        : new Date(),
    },
  });
  const result = await getAnalysis(id, { manuallyUpdated: true });
  return Response.json(
    {
      override: {
        ...override,
        observedAt: override.observedAt.toISOString(),
        createdAt: override.createdAt.toISOString(),
      },
      analysisUpdated: true,
      analysis: result?.analysis,
    },
    { status: 201 },
  );
}
