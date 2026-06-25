import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateMatchFinder } from "@/components/home/DateMatchFinder";
import { demoMatches } from "@/data/demo";

describe("DateMatchFinder", () => {
  afterEach(() => vi.restoreAllMocks());

  it("busca y muestra partidos normalizados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          mode: "demo",
          source: "Datos demostrativos locales",
          warnings: [],
          matches: demoMatches,
        }),
      }),
    );
    render(<DateMatchFinder initialDate="2026-06-15" />);
    await userEvent.click(
      screen.getByRole("button", { name: /buscar partidos/i }),
    );
    expect(await screen.findByText(/Colombia vs Brasil/i)).toBeVisible();
  });
});
