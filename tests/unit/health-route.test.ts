import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db/prisma", () => ({
  getDatabaseRuntimeStatus: () => ({
    status: "unavailable",
    error: "DATABASE_URL no está configurada con una conexión Postgres/Neon.",
  }),
  prisma: {
    apiUsage: {
      count: vi.fn(async () => {
        throw new Error("No debe consultar Prisma sin conexión real");
      }),
    },
  },
}));

vi.mock("@/lib/services/apiUsageService", () => ({
  getApiUsageSnapshot: vi.fn(async () => []),
}));

vi.mock("@/lib/services/providerTelemetryService", () => ({
  getProviderTelemetrySnapshot: vi.fn(async () => []),
}));

describe("/api/health", () => {
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
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\/|apikey|secret/i);
  });
});
