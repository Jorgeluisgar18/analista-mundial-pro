import { describe, expect, it, vi } from "vitest";
import { createRefreshService } from "@/lib/services/refreshService";
import { demoDataset } from "@/data/demo";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";

vi.mock("server-only", () => ({}));

function analysisPayload() {
  return {
    dataset: demoDataset,
    analysis: analyzeMatch(demoDataset),
  };
}

describe("refreshService", () => {
  it("usa caché por defecto para evitar llamadas de proveedor innecesarias", async () => {
    const getAnalysis = vi.fn(async () => analysisPayload());
    const service = createRefreshService({
      analysisService: { getAnalysis },
    });

    const result = await service.refreshMatch("external-cache-test");

    expect(result?.refreshMode).toBe("cache-aware");
    expect(getAnalysis).toHaveBeenCalledWith("external-cache-test", {
      persist: true,
      bypassCache: false,
    });
  });

  it("permite forzar proveedor cuando bypassCache está activo", async () => {
    const getAnalysis = vi.fn(async () => analysisPayload());
    const service = createRefreshService({
      analysisService: { getAnalysis },
    });

    const result = await service.refreshMatch("external-cache-test", {
      bypassCache: true,
    });

    expect(result?.refreshMode).toBe("provider");
    expect(getAnalysis).toHaveBeenCalledWith("external-cache-test", {
      persist: true,
      bypassCache: true,
    });
  });
});
