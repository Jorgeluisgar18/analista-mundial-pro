import { describe, expect, it, vi } from "vitest";
import { GET as getMatches } from "@/app/api/matches/route";
import { POST as createOverride } from "@/app/api/match/[id]/overrides/route";
import MatchPage from "@/app/match/[id]/page";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { demoDataset } from "@/data/demo";
import { prisma } from "@/lib/db/prisma";

vi.mock("server-only", () => ({}));

describe("API routes", () => {
  it("rechaza una fecha inválida", async () => {
    const response = await getMatches(
      new Request("http://local/api/matches?date=25-06-2026"),
    );
    expect(response.status).toBe(400);
  });

  it("devuelve partidos demo normalizados", async () => {
    const response = await getMatches(
      new Request("http://local/api/matches?date=2026-06-15"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matches[0].id).toBe("demo-col-bra");
    expect(body.mode).toBe("demo");
  });

  it("rechaza JSON malformado en cambios manuales", async () => {
    let response: Response | undefined;
    try {
      response = await createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{bad",
        }),
        { params: Promise.resolve({ id: "demo-col-bra" }) },
      );
    } catch {
      response = undefined;
    }

    expect(response?.status).toBe(400);
    expect(response?.headers.get("content-type")).toContain(
      "application/problem+json",
    );
  });

  it("aplica una baja estructurada antes de recalcular el análisis", async () => {
    const baseline = analyzeMatch(demoDataset);
    const response = await createOverride(
      new Request("http://local/api/match/demo-col-bra/overrides", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "absence",
          description: "Delantero titular descartado",
          teamId: demoDataset.match.homeTeam.id,
          impact: "high",
          area: "attack",
        }),
      }),
      { params: Promise.resolve({ id: "demo-col-bra" }) },
    );
    const body = await response.json();

    try {
      expect(response.status).toBe(201);
      expect(body.override.teamId).toBe(demoDataset.match.homeTeam.id);
      expect(body.override.impact).toBe("high");
      expect(body.analysis.expected.homeGoals).toBeLessThan(
        baseline.expected.homeGoals,
      );
      expect(body.analysis.mainProbabilities.home).toBeLessThan(
        baseline.mainProbabilities.home,
      );
    } finally {
      if (body.override?.id) {
        await prisma.manualOverride.delete({
          where: { id: body.override.id },
        });
      }
    }
  });

  it("mantiene el recálculo manual al volver a cargar la página", async () => {
    const match = await prisma.match.findUniqueOrThrow({
      where: { externalId: "demo-col-bra" },
    });
    const override = await prisma.manualOverride.create({
      data: {
        matchId: match.id,
        type: "absence",
        description: "Baja ofensiva confirmada",
        teamId: demoDataset.match.homeTeam.id,
        impact: "high",
        area: "attack",
        observedAt: new Date(),
      },
    });

    try {
      const page = await MatchPage({
        params: Promise.resolve({ id: "demo-col-bra" }),
      });
      const baseline = analyzeMatch(demoDataset);

      expect(page.props.initialAnalysis.manuallyUpdated).toBe(true);
      expect(page.props.initialAnalysis.expected.homeGoals).toBeLessThan(
        baseline.expected.homeGoals,
      );
    } finally {
      await prisma.manualOverride.delete({ where: { id: override.id } });
    }
  });
});
