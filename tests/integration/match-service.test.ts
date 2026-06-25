import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo";
import { createMatchService } from "@/lib/services/matchService";

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
});
