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

const { authorization } = vi.hoisted(() => ({ authorization: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getAdminAuthorization: authorization }));

async function withAdminSession<T>(callback: () => Promise<T>): Promise<T> {
  authorization.mockResolvedValue("authorized");
  return callback();
}
async function withoutAuthConfiguration<T>(callback: () => Promise<T>): Promise<T> {
  authorization.mockResolvedValue("unavailable");
  return callback();
}
async function withoutAdminSession<T>(callback: () => Promise<T>): Promise<T> {
  authorization.mockResolvedValue("unauthenticated");
  return callback();
}
function analystHeaders(extra?: HeadersInit) {
  return {
    "content-type": "application/json",
    origin: "http://local",
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
      response = await withAdminSession(() =>
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
    const response = await withAdminSession(() =>
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
    const response = await withAdminSession(() =>
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

  it("rechaza cambios manuales sin sesión", async () => {
    const response = await withoutAdminSession(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://local" },
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
    expect(body.title).toMatch(/sesión de administrador requerida/i);
  });

  it("rechaza un token antiguo sin sesión", async () => {
    const response = await withoutAdminSession(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://local",
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
    expect(body.title).toMatch(/sesión de administrador requerida/i);
  });

  it("acepta una sesión administradora verificada", async () => {
    const response = await withAdminSession(() =>
      createOverride(
        new Request("http://local/api/match/demo-col-bra/overrides", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://local",
            authorization: "Bearer obsolete-token",
          },
          body: JSON.stringify({
            type: "absence",
            description: "Baja confirmada con sesión administradora",
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

  it("falla cerrado si autenticación no está configurada", async () => {
    const response = await withoutAuthConfiguration(() =>
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
    expect(body.title).toMatch(/edición manual no disponible/i);
  });

  it("no se bloquea con user-agent vacío o extenso", async () => {
    const requests = [
      new Request("http://local/api/match/demo-col-bra/analyze", {
        method: "POST",
        headers: { origin: "http://local", "user-agent": "" },
      }),
      new Request("http://local/api/match/demo-col-bra/analyze", {
        method: "POST",
        headers: { origin: "http://local", "user-agent": `qa-agent/${"x".repeat(4096)}` },
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
            headers: { origin: "http://local" },
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
            headers: { origin: "http://local" },
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

  it("aplica una baja estructurada antes de recalcular el análisis", async () => {
    const baseline = analyzeMatch(demoDataset);
    const response = await withAdminSession(() =>
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

    // Demo overrides operate on a cloned dataset and create no database row.
    expect(response.status).toBe(201);
    expect(body.override.teamId).toBe(demoDataset.match.homeTeam.id);
    expect(body.override.impact).toBe("high");
    expect(body.analysis.expected.homeGoals).toBeLessThan(
      baseline.expected.homeGoals,
    );
    expect(body.analysis.mainProbabilities.home).toBeLessThan(
      baseline.mainProbabilities.home,
    );
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
    const response = await withAdminSession(() =>
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
