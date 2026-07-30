import { describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { createMatchService } from "@/lib/services/matchService";
import { getApiUsageSnapshot } from "@/lib/services/apiUsageService";
import { createRuntimePolicy } from "@/lib/runtime/productionPolicy";

vi.mock("@/lib/services/apiUsageService", () => ({
  getApiUsageSnapshot: vi.fn(async () => []),
}));
vi.mock("server-only", () => ({}));

const mockedGetApiUsageSnapshot = vi.mocked(getApiUsageSnapshot);

describe("matchService", () => {
  it("usa demo claramente etiquetado cuando no hay claves", async () => {
    const service = createMatchService({ env: {} });
    const result = await service.listByDate("2026-06-15");
    expect(result.mode).toBe("demo");
    expect(result.matches[0]?.dataOrigin).toBe("DEMO");
  });

  it("en producción no reemplaza la falta de cobertura real por datos demo", async () => {
    const service = createMatchService({
      env: {},
      runtimePolicy: createRuntimePolicy({ NODE_ENV: "production" }),
    });

    await expect(service.listByDate("2026-06-15")).rejects.toMatchObject({
      status: 503,
      name: "ProductionDataUnavailableError",
    });
  });

  it("en producción no abre datasets demo por id", async () => {
    const service = createMatchService({
      env: {},
      runtimePolicy: createRuntimePolicy({ NODE_ENV: "production" }),
    });

    await expect(service.getById("demo-col-bra")).resolves.toBeNull();
  });

  it("en producción rechaza un snapshot fresco que contiene datos demo", async () => {
    const service = createMatchService({
      env: {},
      runtimePolicy: createRuntimePolicy({ NODE_ENV: "production" }),
      snapshotCache: {
        async getFreshDataset() {
          return structuredClone(demoDataset);
        },
      },
    });

    await expect(service.getById("real-provider--cached")).rejects.toMatchObject({
      status: 503,
      name: "ProductionDataUnavailableError",
    });
  });

  it("en producción conserva la lista real si el snapshot de enriquecimiento es demo", async () => {
    const listedMatch = {
      ...demoDataset.match,
      id: "real-listed",
      dataOrigin: "API" as const,
      homeTeam: { ...demoDataset.match.homeTeam, name: "Local real" },
      awayTeam: { ...demoDataset.match.awayTeam, name: "Visitante real" },
    };
    const service = createMatchService({
      runtimePolicy: createRuntimePolicy({ NODE_ENV: "production" }),
      snapshotCache: {
        async getFreshDataset() {
          return structuredClone(demoDataset);
        },
      },
      providers: {
        football: [
          {
            id: "api-football",
            async listMatches() {
              return {
                data: [listedMatch],
                meta: {
                  source: "API-Football",
                  fetchedAt: "2026-06-15T12:00:00.000Z",
                  isStale: false,
                  warnings: [],
                },
              };
            },
            async getMatch() {
              return {
                data: null,
                meta: {
                  source: "API-Football",
                  fetchedAt: "2026-06-15T12:00:00.000Z",
                  isStale: false,
                  warnings: [],
                },
              };
            },
          },
        ],
      },
    });

    const result = await service.listByDate("2026-06-15");

    expect(result.matches[0]).toMatchObject({
      id: "api-football--real-listed",
      dataOrigin: "API",
      homeTeam: { name: "Local real" },
      awayTeam: { name: "Visitante real" },
    });
    expect(JSON.stringify(result.matches)).not.toContain("demo-col-bra");
  });

  it("devuelve vacío para una fecha demo sin partidos", async () => {
    const service = createMatchService({ env: {} });
    const result = await service.listByDate("2026-07-01");
    expect(result.matches).toEqual([]);
  });

  it("permite abrir el detalle de cada partido demo listado", async () => {
    const service = createMatchService({ env: {} });
    const listed = await service.listByDate("2026-06-15");

    for (const match of listed.matches) {
      const detail = await service.getById(match.id);
      expect(detail?.match.id).toBe(match.id);
      expect(detail?.match.homeTeam.name).toBe(match.homeTeam.name);
      expect(detail?.match.awayTeam.name).toBe(match.awayTeam.name);
    }
  });

  it("prefija IDs de proveedores reales y abre el detalle en el proveedor correcto", async () => {
    const firstProviderDetailCall = vi.fn();
    const secondProviderDetailCall = vi.fn();
    const apiDataset = structuredClone(demoDataset);
    apiDataset.match.id = "same-id";
    apiDataset.match.homeTeam.name = "Equipo equivocado";
    const expectedDataset = structuredClone(demoDataset);
    expectedDataset.match.id = "same-id";
    expectedDataset.match.homeTeam.name = "Equipo correcto";
    const service = createMatchService({
      providers: {
        football: [
          {
            id: "api-football",
            async listMatches() {
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
            async getMatch(id: string) {
              firstProviderDetailCall(id);
              return {
                data: apiDataset,
                meta: {
                  source: "API-Football",
                  fetchedAt: new Date().toISOString(),
                  isStale: false,
                  warnings: [],
                },
              };
            },
          },
          {
            id: "footballdata-io",
            async listMatches() {
              return {
                data: [
                  {
                    ...demoDataset.match,
                    id: "same-id",
                    homeTeam: {
                      ...demoDataset.match.homeTeam,
                      name: "Equipo correcto",
                    },
                  },
                ],
                meta: {
                  source: "Footballdata.io",
                  fetchedAt: new Date().toISOString(),
                  isStale: false,
                  warnings: [],
                },
              };
            },
            async getMatch(id: string) {
              secondProviderDetailCall(id);
              return {
                data: expectedDataset,
                meta: {
                  source: "Footballdata.io",
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

    const listed = await service.listByDate("2026-06-15");
    expect(listed.matches[0]?.id).toBe("footballdata-io--same-id");

    const detail = await service.getById("footballdata-io--same-id", true);

    expect(firstProviderDetailCall).not.toHaveBeenCalled();
    expect(secondProviderDetailCall).toHaveBeenCalledWith("same-id");
    expect(detail?.match.id).toBe("footballdata-io--same-id");
    expect(detail?.match.homeTeam.name).toBe("Equipo correcto");
  });

  it("diferencia un fallo de proveedor de un partido inexistente", async () => {
    const service = createMatchService({
      providers: {
        football: [
          {
            id: "api-football",
            async listMatches() {
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
              throw new Error("Cuota agotada temporalmente");
            },
          },
        ],
      },
    });

    await expect(service.getById("api-football--provider-down", true)).rejects.toMatchObject({
      status: 503,
      providerId: "api-football",
    });
  });

  it("protege la cuota gratis de API-Football y evita llamar al proveedor cuando queda reserva baja", async () => {
    mockedGetApiUsageSnapshot.mockResolvedValueOnce([
      {
        provider: "API-Football",
        used: 91,
        limit: 100,
        period: "day",
        periodKey: "2099-07-12",
        resetsAt: "2099-07-13T00:00:00.000Z",
        updatedAt: "2026-07-12T12:00:00.000Z",
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

  it("conserva advertencias del proveedor aunque la respuesta venga sin partidos", async () => {
    const service = createMatchService({
      providers: {
        football: [
          {
            id: "api-football",
            async listMatches() {
              return {
                data: [],
                meta: {
                  source: "API-Football",
                  fetchedAt: new Date().toISOString(),
                  isStale: false,
                  warnings: [
                    "API-Football omitido para esta liga/temporada en plan gratuito; se intenta con proveedores complementarios.",
                  ],
                },
              };
            },
            async getMatch() {
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

    const result = await service.listByDate("2026-07-01", "premier-league");

    expect(result.warnings.join(" ")).toMatch(/omitido/i);
    expect(result.warnings.join(" ")).toMatch(/API-Football: sin partidos/i);
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
  it("aplica proveedores de enriquecimiento al dataset antes de devolver el detalle", async () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.id = "external-enrichment-test";
    dataset.match.dataOrigin = "API";
    dataset.match.homeTeam.logoUrl = undefined;
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
        enrichment: [
          {
            id: "enrichment-test",
            async enrich(inputDataset) {
              return {
                data: {
                  ...inputDataset,
                  match: {
                    ...inputDataset.match,
                    homeTeam: {
                      ...inputDataset.match.homeTeam,
                      logoUrl: "https://img.example/enriched.png",
                    },
                  },
                  sources: [
                    ...inputDataset.sources,
                    {
                      id: "enrichment-source",
                      label: "Enrichment",
                      type: "provider" as const,
                      status: "confirmed" as const,
                      observedAt: "2026-07-01T12:00:00.000Z",
                      detail: "Contexto enriquecido.",
                    },
                  ],
                },
                meta: {
                  source: "Enrichment",
                  fetchedAt: "2026-07-01T12:00:00.000Z",
                  isStale: false,
                  warnings: [],
                },
              };
            },
          },
        ],
      },
    });

    const result = await service.getById("external-enrichment-test");

    expect(result?.match.homeTeam.logoUrl).toBe(
      "https://img.example/enriched.png",
    );
    expect(result?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "enrichment-source" }),
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

  it("omite The Odds API cuando la reserva mensual local está comprometida", async () => {
    mockedGetApiUsageSnapshot
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          provider: "The Odds API",
          used: 480,
          limit: 500,
          period: "month",
          periodKey: "2026-07",
          resetsAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-07-01T12:00:00.000Z",
        },
      ]);
    const dataset = structuredClone(demoDataset);
    dataset.match.id = "external-odds-quota-test";
    dataset.match.dataOrigin = "API";
    dataset.odds = [];
    const oddsCall = vi.fn();
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
        odds: {
          id: "the-odds-api",
          async getOdds() {
            oddsCall();
            throw new Error("No debió consultar odds con reserva baja");
          },
        },
      },
    });

    const result = await service.getById("external-odds-quota-test");

    expect(oddsCall).not.toHaveBeenCalled();
    expect(result?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "odds-quota-guard",
          detail: expect.stringMatching(/plan gratuito/i),
        }),
      ]),
    );
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

  it("permite saltar el snapshot persistente solo cuando bypassCache está activo", async () => {
    const cachedDataset = structuredClone(demoDataset);
    cachedDataset.match.id = "external-bypass-cache-test";
    cachedDataset.match.dataOrigin = "CACHE";
    const providerDataset = structuredClone(demoDataset);
    providerDataset.match.id = cachedDataset.match.id;
    providerDataset.match.dataOrigin = "API";
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
              return {
                data: providerDataset,
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
      },
    });

    const cached = await service.getById(cachedDataset.match.id);
    const bypassed = await service.getById(cachedDataset.match.id, true);

    expect(cached?.match.dataOrigin).toBe("CACHE");
    expect(bypassed?.match.dataOrigin).toBe("API");
    expect(providerCall).toHaveBeenCalledTimes(1);
  });

  it("deduplica consultas simultaneas sin bypass para proteger cuota del proveedor", async () => {
    const providerDataset = structuredClone(demoDataset);
    providerDataset.match.id = "external-concurrent-cache-test";
    providerDataset.match.dataOrigin = "API";
    let resolveProvider!: (value: typeof providerDataset) => void;
    const providerReady = new Promise<typeof providerDataset>((resolve) => {
      resolveProvider = resolve;
    });
    const providerCall = vi.fn();
    const service = createMatchService({
      snapshotCache: {
        async getFreshDataset() {
          return null;
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
              const data = await providerReady;
              return {
                data,
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
      },
    });

    const first = service.getById("external-concurrent-cache-test");
    const second = service.getById("external-concurrent-cache-test");
    resolveProvider(providerDataset);
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult?.match.id).toBe(
      "football-test--external-concurrent-cache-test",
    );
    expect(secondResult?.match.id).toBe(
      "football-test--external-concurrent-cache-test",
    );
    expect(providerCall).toHaveBeenCalledTimes(1);
  });

  it("no deduplica consultas con bypass porque representan refresh forzado", async () => {
    const providerDataset = structuredClone(demoDataset);
    providerDataset.match.id = "external-forced-refresh-test";
    providerDataset.match.dataOrigin = "API";
    const providerCall = vi.fn();
    const service = createMatchService({
      snapshotCache: {
        async getFreshDataset() {
          throw new Error("No debe consultar snapshot con bypass activo");
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
              return {
                data: providerDataset,
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
      },
    });

    await Promise.all([
      service.getById("external-forced-refresh-test", true),
      service.getById("external-forced-refresh-test", true),
    ]);

    expect(providerCall).toHaveBeenCalledTimes(2);
  });
});
