import { describe, expect, it, vi } from "vitest";
import { GET as getMatches } from "@/app/api/matches/route";
import { GET as getCompetitions } from "@/app/api/competitions/route";
import { GET as getProviderStatus } from "@/app/api/provider-status/route";
import { GET as getUsage } from "@/app/api/usage/route";
import { POST as analyzeMatchRoute } from "@/app/api/match/[id]/analyze/route";
import { POST as refreshMatchRoute } from "@/app/api/match/[id]/refresh/route";
import { POST as createOverride } from "@/app/api/match/[id]/overrides/route";
import { GET as getHistory } from "@/app/api/match/[id]/history/route";
import MatchPage from "@/app/match/[id]/page";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { demoDataset } from "@/data/demo";
import { prisma } from "@/lib/db/prisma";
import { itWithDatabase } from "../helpers/database";

vi.mock("server-only", () => ({}));

const ANALYST_TOKEN = "test-analyst-token";

async function withAnalystToken<T>(callback: () => Promise<T>): Promise<T> {
  const previous = process.env.ANALYST_OVERRIDE_TOKEN;
  process.env.ANALYST_OVERRIDE_TOKEN = ANALYST_TOKEN;
  try {
    return await callback();
  } finally {
    if (previous === undefined) {
      delete process.env.ANALYST_OVERRIDE_TOKEN;
    } else {
      process.env.ANALYST_OVERRIDE_TOKEN = previous;
    }
  }
}

async function withoutAnalystToken<T>(callback: () => Promise<T>): Promise<T> {
  const previous = process.env.ANALYST_OVERRIDE_TOKEN;
  delete process.env.ANALYST_OVERRIDE_TOKEN;
  try {
    return await callback();
  } finally {
    if (previous !== undefined) {
      process.env.ANALYST_OVERRIDE_TOKEN = previous;
    }
  }
}

function analystHeaders(extra?: HeadersInit) {
  return {
    "content-type": "application/json",
    "x-analyst-token": ANALYST_TOKEN,
    ...extra,
  };
}

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
    expect(body.matches[0].timezone).toBe("America/Bogota");
    expect(body.matches[0].time).toBe("17:00");
    expect(body.mode).toBe("demo");
  });

  it("expone estado seguro de proveedores en la búsqueda de partidos", async () => {
    const response = await getMatches(
      new Request("http://local/api/matches?date=2026-06-26&competition=all"),
    );
    const body = await response.json();

    expect(body.providerStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          envName: "FOOTBALL_API_KEY",
          configured: expect.any(Boolean),
        }),
        expect.objectContaining({
          envName: "FOOTBALL_DATA_API_KEY",
          configured: expect.any(Boolean),
        }),
      ]),
    );
    expect(JSON.stringify(body.providerStatus)).not.toMatch(/sk-|secret|token/i);
  });

  it("expone un endpoint de diagnóstico de proveedores sin secretos", async () => {
    const response = await getProviderStatus();
    const body = await response.json();

    expect(body.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "football-data",
          envName: "FOOTBALL_DATA_API_KEY",
          configured: expect.any(Boolean),
        }),
      ]),
    );
    expect(body.docsPath).toBe("/docs/provider-setup");
    expect(JSON.stringify(body)).not.toMatch(/api-football-secret|odds-secret/i);
  });

  it("usa la misma fuente de verdad de proveedores en competitions y usage", async () => {
    const previousFootballApi = process.env.FOOTBALL_API_KEY;
    const previousFootballData = process.env.FOOTBALL_DATA_API_KEY;
    const previousFootballdataIo = process.env.FOOTBALLDATA_IO_API_KEY;
    const previousSportsDb = process.env.THE_SPORTSDB_API_KEY;
    try {
      delete process.env.FOOTBALL_API_KEY;
      delete process.env.FOOTBALL_DATA_API_KEY;
      process.env.FOOTBALLDATA_IO_API_KEY = "valid-footballdata-key";
      process.env.THE_SPORTSDB_API_KEY = "123";

      const competitions = await (await getCompetitions()).json();
      const usage = await (await getUsage()).json();

      expect(competitions.mode).toBe("api-ready");
      expect(usage.configured).toHaveProperty("TheSportsDB", true);
    } finally {
      if (previousFootballApi === undefined) delete process.env.FOOTBALL_API_KEY;
      else process.env.FOOTBALL_API_KEY = previousFootballApi;
      if (previousFootballData === undefined) delete process.env.FOOTBALL_DATA_API_KEY;
      else process.env.FOOTBALL_DATA_API_KEY = previousFootballData;
      if (previousFootballdataIo === undefined) {
        delete process.env.FOOTBALLDATA_IO_API_KEY;
      } else {
        process.env.FOOTBALLDATA_IO_API_KEY = previousFootballdataIo;
      }
      if (previousSportsDb === undefined) delete process.env.THE_SPORTSDB_API_KEY;
      else process.env.THE_SPORTSDB_API_KEY = previousSportsDb;
    }
  });

  it("rechaza JSON malformado en cambios manuales", async () => {
    let response: Response | undefined;
    try {
      response = await withAnalystToken(() =>
        createOverride(
          new Request("http://local/api/match/demo-col-bra/overrides", {
            method: "POST",
            headers: analystHeaders(),
            body: "{bad",
          }),
          { params: Promise.resolve({ id: "demo-col-bra" }) },
        ),
      );
    } catch {
      response = undefined;
    }

    expect(response?.status).toBe(400);
    expect(response?.headers.get("content-type")).toContain(
      "application/problem+json",
    );
  });

  it("rechaza payloads demasiado grandes antes de parsear cambios manuales", async () => {
    const largePayload = JSON.stringify({
      type: "absence",
      description: "x".repeat(40_000),
      teamId: demoDataset.match.homeTeam.id,
      impact: "high",
      area: "attack",
    });
    const response = await withAnalystToken(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: analystHeaders({
            "content-length": String(
              new TextEncoder().encode(largePayload).length,
            ),
          }),
          body: largePayload,
        }),
        { params: Promise.resolve({ id: "demo-col-bra" }) },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.title).toMatch(/solicitud demasiado grande/i);
  });

  it("rechaza payloads demasiado grandes aunque falte content-length", async () => {
    const largePayload = JSON.stringify({
      type: "absence",
      description: "x".repeat(40_000),
      teamId: demoDataset.match.homeTeam.id,
      impact: "high",
      area: "attack",
    });
    const response = await withAnalystToken(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: analystHeaders(),
          body: largePayload,
        }),
        { params: Promise.resolve({ id: "demo-col-bra" }) },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.title).toMatch(/solicitud demasiado grande/i);
  });

  it("rechaza cambios manuales sin token de analista", async () => {
    const response = await withAnalystToken(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: "absence",
            description: "Intento sin credencial de analista",
            teamId: demoDataset.match.homeTeam.id,
            impact: "high",
            area: "attack",
          }),
        }),
        { params: Promise.resolve({ id: "demo-col-bra" }) },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.title).toMatch(/credencial de analista requerida/i);
  });

  it("rechaza cambios manuales con token de analista incorrecto", async () => {
    const response = await withAnalystToken(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-analyst-token": "wrong-token",
          },
          body: JSON.stringify({
            type: "absence",
            description: "Intento con credencial incorrecta",
            teamId: demoDataset.match.homeTeam.id,
            impact: "high",
            area: "attack",
          }),
        }),
        { params: Promise.resolve({ id: "demo-col-bra" }) },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.title).toMatch(/credencial de analista requerida/i);
  });

  it("acepta credencial de analista mediante Authorization Bearer", async () => {
    const response = await withAnalystToken(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${ANALYST_TOKEN}`,
          },
          body: JSON.stringify({
            type: "absence",
            description: "Baja confirmada con bearer token",
            teamId: demoDataset.match.homeTeam.id,
            impact: "high",
            area: "attack",
          }),
        }),
        { params: Promise.resolve({ id: "demo-col-bra" }) },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.override.id).toMatch(/^demo-manual-/);
  });

  it("falla cerrado si el token de analista no está configurado", async () => {
    const response = await withoutAnalystToken(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: analystHeaders(),
          body: JSON.stringify({
            type: "absence",
            description: "Intento sin configuración segura",
            teamId: demoDataset.match.homeTeam.id,
            impact: "high",
            area: "attack",
          }),
        }),
        { params: Promise.resolve({ id: "demo-col-bra" }) },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.title).toMatch(/edición manual no configurada/i);
  });

  it("no se bloquea con user-agent vacío o extenso", async () => {
    const requests = [
      new Request("http://local/api/match/demo-col-bra/analyze", {
        method: "POST",
        headers: { "user-agent": "" },
      }),
      new Request("http://local/api/match/demo-col-bra/analyze", {
        method: "POST",
        headers: { "user-agent": `qa-agent/${"x".repeat(4096)}` },
      }),
    ];

    const responses = await Promise.race([
      Promise.all(
        requests.map((request) =>
          analyzeMatchRoute(request, {
            params: Promise.resolve({ id: "demo-col-bra" }),
          }),
        ),
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("User-Agent regression timeout")),
          2_000,
        ),
      ),
    ]);

    expect(responses.every((response) => response.status === 200)).toBe(true);
  });

  it("atiende análisis concurrentes en el endpoint POST correcto", async () => {
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        analyzeMatchRoute(
          new Request("http://local/api/match/demo-col-bra/analyze", {
            method: "POST",
          }),
          { params: Promise.resolve({ id: "demo-col-bra" }) },
        ),
      ),
    );

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(responses.every((response) => response.status !== 405)).toBe(true);
  });

  it("atiende refresh concurrente en el endpoint POST correcto", async () => {
    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        refreshMatchRoute(
          new Request("http://local/api/match/demo-col-bra/refresh", {
            method: "POST",
          }),
          { params: Promise.resolve({ id: "demo-col-bra" }) },
        ),
      ),
    );

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(responses.every((response) => response.status !== 405)).toBe(true);
  });

  it("rechaza cambios manuales enviados desde otro origen", async () => {
    const response = await createOverride(
      new Request("http://local/api/match/demo-col-bra/overrides", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example",
        },
        body: JSON.stringify({
          type: "absence",
          description: "Intento desde origen externo",
          teamId: demoDataset.match.homeTeam.id,
          impact: "high",
          area: "attack",
        }),
      }),
      { params: Promise.resolve({ id: "demo-col-bra" }) },
    );
    const body = await response.json();

    try {
      expect(response.status).toBe(403);
      expect(body.title).toMatch(/origen no permitido/i);
    } finally {
      if (body.override?.id) {
        await prisma.manualOverride.delete({
          where: { id: body.override.id },
        });
      }
    }
  });

  itWithDatabase("aplica una baja estructurada antes de recalcular el análisis", async () => {
    const baseline = analyzeMatch(demoDataset);
    const response = await withAnalystToken(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: analystHeaders(),
          body: JSON.stringify({
            type: "absence",
            description: "Delantero titular descartado",
            teamId: demoDataset.match.homeTeam.id,
            impact: "high",
            area: "attack",
          }),
        }),
        { params: Promise.resolve({ id: "demo-col-bra" }) },
      ),
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

  itWithDatabase("mantiene el recálculo manual al volver a cargar la página", async () => {
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
  it("devuelve historial vacio para partidos demo validos sin exigir DB", async () => {
    const response = await getHistory(
      new Request("http://local/api/match/demo-col-bra/history"),
      { params: Promise.resolve({ id: "demo-col-bra" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analyses).toEqual([]);
    expect(body.overrides).toEqual([]);
  });

  it("permite recalcular manualmente un partido demo sin persistencia", async () => {
    const response = await withAnalystToken(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: analystHeaders(),
          body: JSON.stringify({
            type: "absence",
            description: "Delantero titular descartado por prueba QA",
            teamId: demoDataset.match.homeTeam.id,
            impact: "high",
            area: "attack",
          }),
        }),
        { params: Promise.resolve({ id: "demo-col-bra" }) },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.override.id).toMatch(/^demo-manual-/);
    expect(body.analysis.manuallyUpdated).toBe(true);
    expect(body.analysis.expected.homeGoals).toBeLessThan(
      analyzeMatch(demoDataset).expected.homeGoals,
    );
  });
});
