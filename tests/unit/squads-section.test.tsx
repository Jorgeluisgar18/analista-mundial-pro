import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SquadsSection } from "@/components/analysis/sections/SquadsSection";
import { demoDataset } from "@/data/demo";

afterEach(cleanup);

describe("SquadsSection", () => {
  it("shows injuries and suspensions grouped by team with reader-friendly labels", () => {
    const dataset = structuredClone(demoDataset);
    dataset.availability = [
      {
        id: "home-suspension",
        teamId: dataset.match.homeTeam.id,
        player: "Capitán local",
        type: "suspended",
        impact: "Baja disciplinaria que reduce salida limpia.",
        replacement: "Volante mixto",
        evidence: {
          value: "Suspendido",
          status: "confirmed",
          sourceType: "provider",
          source: "API-Football",
          observedAt: "2026-07-06T12:00:00.000Z",
        },
      },
      {
        id: "away-injury",
        teamId: dataset.match.awayTeam.id,
        player: "Extremo visitante",
        type: "injured",
        impact: "Lesión muscular reportada por proveedor.",
        evidence: {
          value: "Lesionado",
          status: "confirmed",
          sourceType: "provider",
          source: "API-Football",
          observedAt: "2026-07-06T12:00:00.000Z",
        },
      },
    ];

    render(<SquadsSection dataset={dataset} subsection="Disponibilidad" />);

    const availability = screen.getByRole("region", {
      name: /bajas y disponibilidad/i,
    });

    expect(within(availability).getByText("Capitán local")).toBeVisible();
    expect(within(availability).getByText("Suspendido")).toBeVisible();
    expect(
      within(availability).getByText(/Reemplazo probable: Volante mixto/i),
    ).toBeVisible();
    expect(within(availability).getByText("Extremo visitante")).toBeVisible();
    expect(within(availability).getByText("Lesionado")).toBeVisible();
  });

  it("explains per team when the provider has no reported injuries or suspensions", () => {
    const dataset = structuredClone(demoDataset);
    dataset.availability = [];

    render(<SquadsSection dataset={dataset} subsection="Disponibilidad" />);

    expect(
      screen.getByText(
        new RegExp(
          `Sin bajas confirmadas o suspendidos reportados para ${dataset.match.homeTeam.name}`,
          "i",
        ),
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        new RegExp(
          `Sin bajas confirmadas o suspendidos reportados para ${dataset.match.awayTeam.name}`,
          "i",
        ),
      ),
    ).toBeVisible();
  });
});
