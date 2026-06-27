import { describe, expect, it } from "vitest";
import { normalizeOpenFootballMatch } from "@/lib/openfootball/normalize";

describe("normalizeOpenFootballMatch", () => {
  it("keeps source provenance and normalized teams", () => {
    const match = normalizeOpenFootballMatch({
      rawMatch: {
        date: "2026-06-11",
        team1: "Mexico",
        team2: "South Africa",
        score: { ft: [2, 1], ht: [1, 0] },
      },
      sourceRepo: "openfootball/worldcup.json",
      sourceCommit: "abc123",
      sourcePath: "2026/worldcup.json",
      sourceIndex: 0,
      competitionName: "World Cup",
      season: "2026",
      round: "Matchday 1",
    });

    expect(match).toMatchObject({
      sourceRepo: "openfootball/worldcup.json",
      sourceCommit: "abc123",
      sourcePath: "2026/worldcup.json",
      sourceIndex: 0,
      externalId: "openfootball-worldcup-json:abc123:2026/worldcup.json:0",
      competitionName: "World Cup",
      season: "2026",
      round: "Matchday 1",
      kickoffDate: "2026-06-11",
      homeTeamName: "Mexico",
      awayTeamName: "South Africa",
      scoreFullTime: [2, 1],
      scoreHalfTime: [1, 0],
    });
  });
});
