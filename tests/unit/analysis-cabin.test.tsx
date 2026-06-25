import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AnalysisCabin } from "@/components/analysis/AnalysisCabin";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { demoDataset } from "@/data/demo";

describe("AnalysisCabin", () => {
  it("abre Mercados y selecciona Goles", async () => {
    render(
      <AnalysisCabin
        initialAnalysis={analyzeMatch(demoDataset)}
        dataset={demoDataset}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /05 · mercados/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: /^goles$/i }));
    expect(
      screen.getByRole("heading", { name: /mercado de goles/i }),
    ).toBeVisible();
  });
});
