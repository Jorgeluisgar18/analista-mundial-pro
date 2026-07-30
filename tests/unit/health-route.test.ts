import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const runtimePolicy = {
  isProduction: false,
  allowsDemoData: true,
  assertDemoAllowed: vi.fn(),
};
const databaseRuntimeStatusMock = vi.fn();
const apiUsageCountMock = vi.fn();
const getModelHealthSnapshotMock = vi.fn();
const hasConfiguredFootballProviderMock = vi.fn(() => false);

vi.mock("@/lib/runtime/productionPolicy", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/runtime/productionPolicy")>()),
  createRuntimePolicy: () => runtimePolicy,
}));

vi.mock("@/lib/db/prisma", () => ({
  getDatabaseRuntimeStatus: databaseRuntimeStatusMock,
  prisma: {
    apiUsage: { count: apiUsageCountMock },
  },
}));

vi.mock("@/lib/services/apiUsageService", () => ({
  getApiUsageSnapshot: vi.fn(async () => []),
}));

vi.mock("@/lib/services/providerTelemetryService", () => ({
  getProviderTelemetrySnapshot: vi.fn(async () => []),
}));

vi.mock("@/lib/services/modelHealthService", () => ({
  getModelHealthSnapshot: getModelHealthSnapshotMock,
}));

vi.mock("@/lib/providers/providerConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/providers/providerConfig")>()),
  hasConfiguredFootballProvider: hasConfiguredFootballProviderMock,
}));

describe("/api/health", () => {
  beforeEach(() => {
    runtimePolicy.isProduction = false;
    hasConfiguredFootballProviderMock.mockReset();
    hasConfiguredFootballProviderMock.mockReturnValue(false);
    databaseRuntimeStatusMock.mockReset();
    databaseRuntimeStatusMock.mockReturnValue({
      status: "unavailable",
      error: "DATABASE_URL is unavailable",
    });
    apiUsageCountMock.mockReset();
    apiUsageCountMock.mockRejectedValue(new Error("Prisma should not run"));
    getModelHealthSnapshotMock.mockReset();
  });

  it("marca la base de datos como no persistente cuando Neon/Postgres no está configurado", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.database).toBe("unavailable");
    expect(body.databaseRecords).toBe(0);
    expect(body.telemetryStatus).toBe("unavailable");
    expect(body.modelHealth.status).toBe("unavailable");
    expect(body.modelHealth.elo.status).toBe("unavailable");
    expect(body.modelHealth.backtesting.status).toBe("unavailable");
    expect(body.mode).toBe("development-demo");
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\/|apikey|secret/i);
  });

  it("en producción se degrada sin revelar el error de base de datos", async () => {
    runtimePolicy.isProduction = true;
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.mode).toBe("degraded");
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\/|apikey|secret/i);
  });

  it("oculta el error interno de modelHealth aunque la DB esté conectada", async () => {
    databaseRuntimeStatusMock.mockReturnValue({
      status: "configured",
      error: null,
    });
    apiUsageCountMock.mockResolvedValue(1);
    hasConfiguredFootballProviderMock.mockReturnValue(true);
    getModelHealthSnapshotMock.mockResolvedValue({
      status: "unavailable",
      error: "postgres://user:credential@db.example/app model-health failure",
    });
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.modelHealth.error).not.toMatch(/postgres:\/\/|credential|failure/i);
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\/|credential|failure/i);
  });

  it("degrada modelHealth de forma segura si su sonda rechaza", async () => {
    databaseRuntimeStatusMock.mockReturnValue({
      status: "configured",
      error: null,
    });
    apiUsageCountMock.mockResolvedValue(1);
    hasConfiguredFootballProviderMock.mockReturnValue(true);
    getModelHealthSnapshotMock.mockRejectedValue(
      new Error("postgres://user:credential@db.example/app model-health failure"),
    );
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("operational");
    expect(body.modelHealth.status).toBe("unavailable");
    expect(body.modelHealth.error).toBe("Estado de salud del modelo no disponible.");
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\/|credential|failure/i);
  });
});
