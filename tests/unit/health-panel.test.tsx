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
});
