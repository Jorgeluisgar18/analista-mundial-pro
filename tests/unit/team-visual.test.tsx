import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeamVisual } from "@/components/shared/TeamVisual";
import type { TeamRef } from "@/types/domain";

function team(name: string, code: string): TeamRef {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    code,
    colors: ["#12e6b2", "#60a5fa"],
  };
}

describe("TeamVisual", () => {
  it("resuelve banderas para selecciones con sufijo National Team", () => {
    render(
      <>
        <TeamVisual
          team={team("Mexico National Team", "MNT")}
          competitionKind="NATIONAL"
          size="hero"
        />
        <TeamVisual
          team={team("South Africa National Team", "SAN")}
          competitionKind="NATIONAL"
          size="hero"
        />
      </>,
    );

    const mexicoSrc =
      screen
        .getByAltText("Bandera de Mexico National Team")
        .getAttribute("src") ?? "";
    const southAfricaSrc =
      screen
        .getByAltText("Bandera de South Africa National Team")
        .getAttribute("src") ?? "";

    expect(decodeURIComponent(mexicoSrc)).toContain("flagcdn.com/w80/mx.png");
    expect(
      decodeURIComponent(southAfricaSrc),
    ).toContain("flagcdn.com/w80/za.png");
    expect(screen.queryByText("MNT")).not.toBeInTheDocument();
    expect(screen.queryByText("SAN")).not.toBeInTheDocument();
  });
});
