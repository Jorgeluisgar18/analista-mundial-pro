import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { createRuntimePolicy } from "@/lib/runtime/productionPolicy";

vi.mock("server-only", () => ({}));

const ingestFinishedDataset = vi.fn();
const enrich = vi.fn();

vi.mock("@/lib/services/historicalSignalService", () => ({
  createHistoricalSignalService: () => ({
    ingestFinishedDataset,
    enrich,
  }),
}));

const database = {
  match: {
    findUnique: vi.fn(),
  },
  manualOverride: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe("analysisService", () => {
  beforeEach(() => {
    ingestFinishedDataset.mockReset();
    enrich.mockReset();
    enrich.mockImplementation(async (dataset) => dataset);
    database.match.findUnique.mockReset();
    database.manualOverride.findMany.mockReset();
    database.match.findUnique.mockResolvedValue(null);
    database.manualOverride.findMany.mockResolvedValue([]);
  });

  it("no ingiere histórico cuando la lectura solicita persist:false", async () => {
    const { createAnalysisService } = await import(
      "@/lib/services/analysisService"
    );
    const service = createAnalysisService({
      database: database as never,
      matchService: {
        async getById() {
          return structuredClone(demoDataset);
        },
      },
    });

    const result = await service.getAnalysis("demo-col-bra", {
      persist: false,
    });

    expect(result).not.toBeNull();
    expect(ingestFinishedDataset).not.toHaveBeenCalled();
    expect(enrich).toHaveBeenCalledOnce();
  });

  it("degrada el histórico sin romper el análisis cuando la DB falla", async () => {
    const { createAnalysisService } = await import(
      "@/lib/services/analysisService"
    );
    enrich.mockRejectedValueOnce(new Error("historical table unavailable"));
    const service = createAnalysisService({
      database: database as never,
      matchService: {
        async getById() {
          return structuredClone(demoDataset);
        },
      },
    });

    const result = await service.getAnalysis("demo-col-bra", {
      persist: false,
    });

    expect(result?.analysis.id).toBe("analysis-demo-col-bra");
  });

  it("en producción falla antes de usar Prisma noop si la DB no está configurada", async () => {
    const { createAnalysisService } = await import(
      "@/lib/services/analysisService"
    );
    const service = createAnalysisService({
      database: database as never,
      databaseRuntimeStatus: () => ({
        status: "unavailable" as const,
        error: "postgres://user:secret@db.example/app",
      }),
      runtimePolicy: createRuntimePolicy({ NODE_ENV: "production" }),
      matchService: {
        async getById() {
          return structuredClone(demoDataset);
        },
      },
    });

    await expect(
      service.getAnalysis("real-provider--123", { persist: false }),
    ).rejects.toMatchObject({
      status: 503,
      name: "ProductionDataUnavailableError",
    });
    expect(database.match.findUnique).not.toHaveBeenCalled();
  });
});
