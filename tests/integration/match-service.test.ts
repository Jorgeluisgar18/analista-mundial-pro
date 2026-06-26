import { describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { createMatchService } from "@/lib/services/matchService";
import { getApiUsageSnapshot } from "@/lib/services/apiUsageService";

vi.mock("@/lib/services/apiUsageService", () => ({
  getApiUsageSnapshot: vi.fn(async () => []),
}));

const mockedGetApiUsageSnapshot = vi.mocked(getApiUsageSnapshot);

describe("matchService", () => {
  it("usa demo claramente etiquetado cuando no hay claves", async () => {
    const service = createMatchService({ env: {} });
    const result = await service.listByDate("2026-06-15");
    expect(result.mode).toBe("demo");
    expect(result.matches[0]?.dataOrigin).toBe("DEMO");
  });

  it("devuelve vacío para una fecha demo sin partidos", async () => {
    const service = createMatchService({ env: {} });
    const result = await service.listByDate("2026-07-01");
    expect(result.matches).toEqual([]);
  });

  it("protege la cuota gratis de API-Football y evita llamar al proveedor cuando queda reserva baja", async () => {
    mockedGetApiUsageSnapshot.mockResolvedValueOnce([
      {
        provider: "API-Football",
        used: 91,
        limit: 100,
        period: "day",
        periodKey: "2026-06-26",
        resetsAt: "2026-06-27T00:00:00.000Z",
        updatedAt: "2026-06-26T12:00:00.000Z",
      },
    ]);
    const providerCall = vi.fn();
    const service = createMatchService({
      providers: {
        football: [
          {
            id: "api-football",
            async listMatches() {
              providerCall();
              return {
                data: [],
                meta: {
                  source: "API-Football",
                  fetchedAt: new Date().toISOString(),
                  isStale: false,
                  warnings: [],
                },
              };
            },
            async getMatch() {
              providerCall();
              return {
                data: null,
                meta: {
                  source: "API-Football",
                  fetchedAt: new Date().toISOString(),
                  isStale: false,
                  warnings: [],
                },
              };
            },
          },
        ],
      },
    });

    const result = await service.listByDate("2026-06-26", "all");

    expect(providerCall).not.toHaveBeenCalled();
    expect(result.mode).toBe("demo");
    expect(result.warnings.join(" ")).toMatch(/plan gratuito/i);
  });

  it("incorpora el clima externo al dataset antes del análisis", async () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.id = "external-weather-test";
    dataset.match.dataOrigin = "API";
    const service = createMatchService({
      providers: {
        football: [
          {
            id: "football-test",
            async listMatches() {
              return {
                data: [],
                meta: {
                  source: "football-test",
                  fetchedAt: new Date().toISOString(),
                  isStale: false,
                  warnings: [],
                },
              };
            },
            async getMatch() {
              return {
                data: dataset,
                meta: {
                  source: "football-test",
                  fetchedAt: new Date().toISOString(),
                  isStale: false,
                  warnings: [],
                },
              };
            },
          },
        ],
        weather: {
          id: "weather-test",
          async getWeatherForLocation() {
            return {
              data: {
                value: "24 °C, humedad 61 %",
                status: "expected" as const,
                sourceType: "provider" as const,
                source: "Open-Meteo",
                observedAt: "2026-08-15T12:00:00Z",
              },
              meta: {
                source: "Open-Meteo",
                fetchedAt: "2026-08-15T12:00:00Z",
                isStale: false,
                warnings: [],
              },
            };
          },
        },
      },
    });

    const result = await service.getById("external-weather-test");

    expect(result?.weather.value).toContain("24 °C");
    expect(result?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "weather-provider" }),
      ]),
    );
  });
  it("reutiliza clima y cuotas frescas para no gastar llamadas externas", async () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.id = "external-cache-test";
    dataset.match.dataOrigin = "API";
    dataset.match.kickoff = "2026-07-10T20:00:00.000Z";
    dataset.weather.observedAt = "2026-07-10T18:40:00.000Z";
    dataset.odds = dataset.odds.map((odd) => ({
      ...odd,
      observedAt: "2026-07-10T18:40:00.000Z",
    }));
    dataset.sources.push(
      {
        id: "weather-provider",
        label: "Open-Meteo",
        type: "provider",
        status: "confirmed",
        observedAt: "2026-07-10T18:40:00.000Z",
        detail: "Snapshot de clima fresco.",
      },
      {
        id: "odds-provider",
        label: "The Odds API",
        type: "provider",
        status: "confirmed",
        observedAt: "2026-07-10T18:40:00.000Z",
        detail: "Snapshot de cuotas fresco.",
      },
    );
    const weatherCall = vi.fn();
    const oddsCall = vi.fn();
    const service = createMatchService({
      now: () => new Date("2026-07-10T18:50:00.000Z"),
      providers: {
        football: [
          {
            id: "football-test",
            async listMatches() {
              return {
                data: [],
                meta: {
                  source: "football-test",
                  fetchedAt: "2026-07-10T18:50:00.000Z",
                  isStale: false,
                  warnings: [],
                },
              };
            },
            async getMatch() {
              return {
                data: dataset,
                meta: {
                  source: "football-test",
                  fetchedAt: "2026-07-10T18:50:00.000Z",
                  isStale: false,
                  warnings: [],
                },
              };
            },
          },
        ],
        weather: {
          id: "weather-test",
          async getWeatherForLocation() {
            weatherCall();
            throw new Error("No debió consultar clima fresco");
          },
        },
        odds: {
          id: "odds-test",
          async getOdds() {
            oddsCall();
            throw new Error("No debió consultar cuotas frescas");
          },
        },
      },
    });

    const result = await service.getById("external-cache-test");

    expect(result?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "weather-cache-hit" }),
        expect.objectContaining({ id: "odds-cache-hit" }),
      ]),
    );
    expect(weatherCall).not.toHaveBeenCalled();
    expect(oddsCall).not.toHaveBeenCalled();
  });

  it("devuelve el snapshot persistente fresco antes de invocar el proveedor principal", async () => {
    const cachedDataset = structuredClone(demoDataset);
    cachedDataset.match.id = "external-snapshot-cache-test";
    cachedDataset.match.dataOrigin = "CACHE";
    cachedDataset.sources.push({
      id: "match-snapshot-cache-hit",
      label: "Caché persistente",
      type: "provider",
      status: "confirmed",
      observedAt: "2026-07-10T18:45:00.000Z",
      detail: "Dataset reutilizado desde MatchSnapshot.",
    });
    const providerCall = vi.fn();
    const service = createMatchService({
      snapshotCache: {
        async getFreshDataset(id: string) {
          return id === cachedDataset.match.id ? cachedDataset : null;
        },
      },
      providers: {
        football: [
          {
            id: "football-test",
            async listMatches() {
              return {
                data: [],
                meta: {
                  source: "football-test",
                  fetchedAt: new Date().toISOString(),
                  isStale: false,
                  warnings: [],
                },
              };
            },
            async getMatch() {
              providerCall();
              throw new Error("No debió invocar proveedor principal");
            },
          },
        ],
      },
    });

    const result = await service.getById(cachedDataset.match.id);

    expect(result?.match.dataOrigin).toBe("CACHE");
    expect(providerCall).not.toHaveBeenCalled();
  });
});
