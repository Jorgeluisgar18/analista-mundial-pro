import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { MatchProviderUnavailableError } from "@/lib/services/matchService";
import { ProductionDataUnavailableError } from "@/lib/runtime/productionPolicy";

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
  it.each([
    ["detalle", "@/app/api/match/[id]/route"],
    ["exportación", "@/app/api/match/[id]/export/route"],
  ])("expone un 503 seguro si no hay datos reales para %s", async (_name, modulePath) => {
    getAnalysisMock.mockRejectedValueOnce(
      new ProductionDataUnavailableError(
        "DATABASE_URL=postgres://user:api-key@db.example/app",
        "La configuración operativa no está disponible.",
      ),
    );
    const route = await import(modulePath);
    const response = await route.GET(
      new Request("http://local/api/match/real-provider--123"),
      { params: Promise.resolve({ id: "real-provider--123" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.title).toBe("Datos reales no disponibles");
    expect(body.detail).toBe("La configuración operativa no está disponible.");
    expect(JSON.stringify(body)).not.toMatch(/demo-col-bra|postgres:\/\/|api-key/i);
  });
});
