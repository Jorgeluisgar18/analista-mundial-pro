import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdatePanel } from "@/components/analysis/UpdatePanel";
import { demoDataset } from "@/data/demo";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UpdatePanel", () => {
  it("envía campos estructurados para cambios de formación", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ analysis: analyzeMatch(demoDataset) }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <UpdatePanel
        matchId={demoDataset.match.id}
        teams={[demoDataset.match.homeTeam, demoDataset.match.awayTeam]}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    await userEvent.selectOptions(
      screen.getByLabelText(/Tipo de cambio/i),
      "formation",
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/Equipo afectado/i),
      demoDataset.match.awayTeam.id,
    );
    await userEvent.clear(screen.getByLabelText(/Valor específico/i));
    await userEvent.type(screen.getByLabelText(/Valor específico/i), "5-4-1");
    await userEvent.type(
      screen.getByLabelText(/Descripción del cambio/i),
      "La fuente oficial reporta cambio a línea de cinco.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Guardar y recalcular/i }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(body).toMatchObject({
      type: "formation",
      teamId: demoDataset.match.awayTeam.id,
      value: "5-4-1",
      description: "La fuente oficial reporta cambio a línea de cinco.",
    });
  });

  it("marca el jugador como requerido en cambios de titular", async () => {
    render(
      <UpdatePanel
        matchId={demoDataset.match.id}
        teams={[demoDataset.match.homeTeam, demoDataset.match.awayTeam]}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    await userEvent.selectOptions(
      screen.getByLabelText(/Tipo de cambio/i),
      "starter",
    );

    expect(screen.getByLabelText(/Jugador confirmado/i)).toBeRequired();
  });
});
