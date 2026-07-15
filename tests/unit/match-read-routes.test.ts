import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { MatchProviderUnavailableError } from "@/lib/services/matchService";

vi.mock("server-only", () => ({}));

const getAnalysisMock = vi.fn();

vi.mock("@/lib/services/analysisService", () => ({
  getAnalysis: getAnalysisMock,
}));

describe("read-only match routes", () => {
  beforeEach(() => {
    getAnalysisMock.mockReset();
    getAnalysisMock.mockResolvedValue({
      dataset: demoDataset,
      analysis: analyzeMatch(demoDataset),
    });
  });

  it("lee el detalle sin persistir snapshots ni analysis runs", async () => {
    const { GET } = await import("@/app/api/match/[id]/route");

    const response = await GET(new Request("http://local/api/match/demo-col-bra"), {
      params: Promise.resolve({ id: "demo-col-bra" }),
    });

    expect(response.status).toBe(200);
    expect(getAnalysisMock).toHaveBeenCalledWith("demo-col-bra", {
      persist: false,
    });
  });

  it("exporta HTML sin persistir por ser una lectura", async () => {
    const { GET } = await import("@/app/api/match/[id]/export/route");

    const response = await GET(
      new Request("http://local/api/match/demo-col-bra/export"),
      { params: Promise.resolve({ id: "demo-col-bra" }) },
    );

    expect(response.status).toBe(200);
    expect(getAnalysisMock).toHaveBeenCalledWith("demo-col-bra", {
      persist: false,
    });
  });

  it("responde 503 si el proveedor del detalle esta temporalmente no disponible", async () => {
    getAnalysisMock.mockRejectedValueOnce(
      new MatchProviderUnavailableError("api-football", "Proveedor caido"),
    );
    const { GET } = await import("@/app/api/match/[id]/route");

    const response = await GET(
      new Request("http://local/api/match/api-football--123"),
      { params: Promise.resolve({ id: "api-football--123" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(body.title).toMatch(/proveedor temporalmente no disponible/i);
  });
});
