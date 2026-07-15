import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";

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
});
