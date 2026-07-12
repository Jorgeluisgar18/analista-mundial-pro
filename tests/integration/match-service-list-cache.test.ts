import { describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { createMatchService } from "@/lib/services/matchService";

vi.mock("@/lib/services/apiUsageService", () => ({
  getApiUsageSnapshot: vi.fn(async () => []),
}));
vi.mock("server-only", () => ({}));

describe("matchService listByDate cache enrichment", () => {
  it("enriquece listados con snapshots persistentes frescos sin llamar detalle del proveedor", async () => {
    const listedMatch = structuredClone(demoDataset.match);
    listedMatch.id = "cached-list-match";
    listedMatch.dataOrigin = "API";
    listedMatch.homeTeam.logoUrl = undefined;
    listedMatch.venue = "Estadio listado por proveedor";

    const cachedDataset = structuredClone(demoDataset);
    cachedDataset.match.id = "provider-test--cached-list-match";
    cachedDataset.match.dataOrigin = "CACHE";
    cachedDataset.match.homeTeam.logoUrl = "https://img.example/cache-home.png";
    cachedDataset.match.venue = "Estadio enriquecido desde cache";

    const detailCall = vi.fn();
    const getFreshDataset = vi.fn(async (id: string) =>
      id === "provider-test--cached-list-match" ? cachedDataset : null,
    );

    const service = createMatchService({
      snapshotCache: { getFreshDataset },
      providers: {
        football: [
          {
            id: "provider-test",
            async listMatches() {
              return {
                data: [listedMatch],
                meta: {
                  source: "Provider Test",
                  fetchedAt: "2026-07-12T12:00:00.000Z",
                  isStale: false,
                  warnings: [],
                },
              };
            },
            async getMatch() {
              detailCall();
              return {
                data: null,
                meta: {
                  source: "Provider Test",
                  fetchedAt: "2026-07-12T12:00:00.000Z",
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

    expect(getFreshDataset).toHaveBeenCalledWith("provider-test--cached-list-match");
    expect(detailCall).not.toHaveBeenCalled();
    expect(result.matches[0]).toMatchObject({
      id: "provider-test--cached-list-match",
      dataOrigin: "CACHE",
      venue: "Estadio enriquecido desde cache",
      homeTeam: expect.objectContaining({
        logoUrl: "https://img.example/cache-home.png",
      }),
    });
    expect(result.warnings.join(" ")).toMatch(/cache persistente/i);
  });
});
