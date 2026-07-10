import { describe, expect, it, vi } from "vitest";
import { getModelHealthSnapshot } from "@/lib/services/modelHealthService";

vi.mock("server-only", () => ({}));

describe("modelHealthService", () => {
  it("reports Elo coverage, latest backtest freshness and calibrated rho", async () => {
    const fakeDatabase = {
      historicalTeamMatch: {
        async count({ where }: { where?: { opponentElo?: { not: null } } } = {}) {
          return where?.opponentElo ? 80 : 100;
        },
      },
      calibrationRun: {
        async findFirst() {
          return {
            id: "cal-1",
            modelName: "AMP ensemble",
            modelVersion: "1.1.0",
            sampleSize: 120,
            brier: 0.48,
            logLoss: 0.98,
            rps: 0.17,
            empiricalHome: 0.42,
            empiricalDraw: 0.29,
            empiricalAway: 0.29,
            config: JSON.stringify({
              source: "historicalMatch:rolling-offline",
              dixonColesRho: -0.06,
              rhoSampleSize: 96,
              rhoAverageLogLoss: 2.12,
            }),
            createdAt: new Date("2026-07-07T12:00:00Z"),
          };
        },
      },
    };

    const snapshot = await getModelHealthSnapshot(
      fakeDatabase as never,
      new Date("2026-07-09T12:00:00Z"),
    );

    expect(snapshot.status).toBe("connected");
    expect(snapshot.elo.status).toBe("ready");
    expect(snapshot.elo.coverage).toBe(80);
    expect(snapshot.backtesting.status).toBe("ready");
    expect(snapshot.backtesting.daysSinceLastRun).toBe(2);
    expect(snapshot.backtesting.dixonColesRho).toBe(-0.06);
  });
});
