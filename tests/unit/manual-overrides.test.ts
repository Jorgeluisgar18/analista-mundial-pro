import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo";
import { applyManualOverrides } from "@/lib/overrides/applyManualOverrides";
import type { ManualOverrideRecord } from "@/types/domain";

const observedAt = "2026-06-25T18:30:00.000Z";

function override(
  patch: Partial<ManualOverrideRecord> & Pick<ManualOverrideRecord, "type">,
): ManualOverrideRecord {
  return {
    id: `override-${patch.type}`,
    type: patch.type,
    description: patch.description ?? "Cambio manual confirmado por fuente.",
    observedAt,
    teamId: patch.teamId,
    player: patch.player,
    impact: patch.impact,
    area: patch.area,
    value: patch.value,
    sourceUrl: patch.sourceUrl,
  };
}

describe("applyManualOverrides", () => {
  it("convierte un titular confirmado en ajuste positivo del equipo", () => {
    const adjusted = applyManualOverrides(demoDataset, [
      override({
        type: "starter",
        teamId: demoDataset.match.homeTeam.id,
        player: "Delantero sorpresa",
        impact: "high",
        area: "attack",
      }),
    ]);

    expect(adjusted.home.shotsOnTarget).toBeGreaterThan(
      demoDataset.home.shotsOnTarget,
    );
    expect(adjusted.lineups[0].starters).toContain("Delantero sorpresa");
    expect(
      adjusted.players.find((player) => player.name === "Delantero sorpresa")
        ?.starterStatus,
    ).toBe("confirmed");
  });

  it("aplica una formación defensiva al perfil táctico del equipo", () => {
    const adjusted = applyManualOverrides(demoDataset, [
      override({
        type: "formation",
        teamId: demoDataset.match.homeTeam.id,
        value: "5-4-1",
      }),
    ]);

    expect(adjusted.lineups[0].formation.value).toBe("5-4-1");
    expect(adjusted.home.goalsAgainst).toBeLessThan(
      demoDataset.home.goalsAgainst,
    );
    expect(adjusted.home.cleanSheetRate).toBeGreaterThan(
      demoDataset.home.cleanSheetRate,
    );
  });

  it("ajusta disciplina cuando se confirma un árbitro estricto", () => {
    const adjusted = applyManualOverrides(demoDataset, [
      override({
        type: "referee",
        value: "Árbitro estricto con media alta de tarjetas",
      }),
    ]);

    expect(adjusted.referee.value).toContain("estricto");
    expect(adjusted.home.cards + adjusted.away.cards).toBeGreaterThan(
      demoDataset.home.cards + demoDataset.away.cards,
    );
  });

  it("reduce ritmo ofensivo con clima pesado", () => {
    const adjusted = applyManualOverrides(demoDataset, [
      override({
        type: "weather",
        value: "Lluvia fuerte y viento cruzado",
      }),
    ]);

    expect(adjusted.weather.value).toContain("Lluvia");
    expect(adjusted.home.shotsOnTarget + adjusted.away.shotsOnTarget).toBeLessThan(
      demoDataset.home.shotsOnTarget + demoDataset.away.shotsOnTarget,
    );
  });

  it("reemplaza cuotas manuales desde un snapshot JSON", () => {
    const adjusted = applyManualOverrides(demoDataset, [
      override({
        type: "odds",
        value: JSON.stringify([
          {
            bookmaker: "Mesa manual",
            market: "h2h",
            outcome: demoDataset.match.homeTeam.name,
            odd: 2.85,
            observedAt,
          },
        ]),
      }),
    ]);

    expect(adjusted.odds).toEqual([
      {
        bookmaker: "Mesa manual",
        market: "h2h",
        outcome: demoDataset.match.homeTeam.name,
        odd: 2.85,
        observedAt,
      },
    ]);
  });

  it("marca el partido como suspendido cuando llega una suspensión manual", () => {
    const adjusted = applyManualOverrides(demoDataset, [
      override({
        type: "suspension",
        description: "Partido suspendido por tormenta eléctrica.",
      }),
    ]);

    expect(adjusted.match.status).toBe("suspended");
  });
});
