import { describe, expect, it } from "vitest";
import {
  calculateFootballElo,
  footballEloTimeline,
  opponentEloUpdates,
  ratingForTeam,
} from "@/lib/historical/elo";

describe("historical Elo", () => {
  it("actualiza ratings según resultado, sede y fuerza del rival", () => {
    const result = calculateFootballElo({
      homeElo: 1500,
      awayElo: 1500,
      homeGoals: 3,
      awayGoals: 1,
    });

    expect(result.homeBefore).toBe(1500);
    expect(result.awayBefore).toBe(1500);
    expect(result.homeAfter).toBeGreaterThan(1500);
    expect(result.awayAfter).toBeLessThan(1500);
    expect(result.homeAfter - 1500).toBeCloseTo(1500 - result.awayAfter, 5);
  });

  it("construye una línea cronológica reproducible de Elo por partido", () => {
    const timeline = footballEloTimeline([
      {
        id: "m1",
        kickoff: new Date("2025-01-01T00:00:00Z"),
        homeTeamId: "alpha",
        awayTeamId: "beta",
        homeGoals: 2,
        awayGoals: 0,
      },
      {
        id: "m2",
        kickoff: new Date("2025-02-01T00:00:00Z"),
        homeTeamId: "alpha",
        awayTeamId: "gamma",
        homeGoals: 1,
        awayGoals: 1,
      },
    ]);

    expect(timeline).toHaveLength(2);
    expect(timeline[1].homeBefore).toBeGreaterThan(1500);
    expect(ratingForTeam(timeline, "alpha")).toBe(timeline[1].homeAfter);
    expect(ratingForTeam(timeline, "missing")).toBe(1500);
  });

  it("genera updates de opponentElo para backfill histórico", () => {
    const updates = opponentEloUpdates([
      {
        id: "m1",
        kickoff: new Date("2025-01-01T00:00:00Z"),
        homeTeamId: "alpha",
        awayTeamId: "beta",
        homeGoals: 2,
        awayGoals: 0,
      },
      {
        id: "m2",
        kickoff: new Date("2025-02-01T00:00:00Z"),
        homeTeamId: "alpha",
        awayTeamId: "beta",
        homeGoals: 0,
        awayGoals: 1,
      },
    ]);

    expect(updates).toHaveLength(4);
    expect(updates[0]).toMatchObject({
      historicalMatchId: "m1",
      teamId: "alpha",
      opponentElo: 1500,
    });
    expect(updates[3].teamId).toBe("beta");
    expect(updates[3].opponentElo).toBeGreaterThan(1500);
  });
});
