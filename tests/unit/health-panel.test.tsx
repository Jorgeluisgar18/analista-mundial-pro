import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthPanel } from "@/components/health/HealthPanel";

afterEach(cleanup);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("HealthPanel", () => {
  it("muestra la configuracion calibrada del modelo cuando health la expone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mode: "api-ready",
          checkedAt: "2026-07-14T12:00:00.000Z",
          providers: [],
          database: "connected",
          modelHealth: {
            status: "connected",
            checkedAt: "2026-07-14T12:00:00.000Z",
            elo: {
              status: "ready",
              totalRows: 100,
              rowsWithOpponentElo: 90,
              coverage: 90,
            },
            backtesting: {
              status: "ready",
              latestRunAt: "2026-07-14T10:00:00.000Z",
              daysSinceLastRun: 0,
              sampleSize: 120,
              brier: 0.48,
              logLoss: 0.98,
              rps: 0.17,
              dixonColesRho: -0.06,
              rhoSampleSize: 96,
              source: "historicalMatch:rolling-offline",
              modelConfig: {
                label: "backtest-1.1.0-historical-120",
                weights: {
                  dixonColes: 0.68,
                  simulation: 0.17,
                  logistic: 0.15,
                },
              },
            },
          },
        }),
      }),
    );

    render(<HealthPanel />);

    expect(await screen.findByText(/pesos calibrados/i)).toBeVisible();
    expect(screen.getByText(/backtest-1.1.0-historical-120/i)).toBeVisible();
    expect(screen.getByText(/DC 68%/i)).toBeVisible();
    expect(screen.getByText(/MC 17%/i)).toBeVisible();
    expect(screen.getByText(/LOG 15%/i)).toBeVisible();
    expect(screen.getByText(/modelo listo para análisis/i)).toBeVisible();
    expect(screen.getByText(/último backtest persistido/i)).toBeVisible();
  });

  it("resume estado operativo de APIs, cuota, cache y persistencia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mode: "api-ready",
          checkedAt: "2026-07-14T12:00:00.000Z",
          database: "connected",
          telemetryStatus: "connected",
          providers: [
            {
              id: "api-football",
              label: "API-Football",
              configured: true,
              purpose: "Fixtures y datos prepartido",
              usage: {
                provider: "API-Football",
                used: 42,
                limit: 100,
                period: "day",
                periodKey: "2026-07-14",
                resetsAt: "2026-07-15T00:00:00.000Z",
                updatedAt: "2026-07-14T11:55:00.000Z",
              },
              telemetry: {
                provider: "API-Football",
                total: 10,
                failures: 0,
                averageLatencyMs: 410,
                lastObservedAt: "2026-07-14T11:55:00.000Z",
              },
            },
          ],
        }),
      }),
    );

    render(<HealthPanel />);

    expect(await screen.findByText(/resumen operativo/i)).toBeVisible();
    expect(screen.getByText(/proveedores activos: 1\/1/i)).toBeVisible();
    expect(screen.getByText(/cuota diaria usada: 42\/100/i)).toBeVisible();
    expect(screen.getByText(/telemetría conectada/i)).toBeVisible();
    expect(screen.getByText(/cache inteligente/i)).toBeVisible();
  });
});
