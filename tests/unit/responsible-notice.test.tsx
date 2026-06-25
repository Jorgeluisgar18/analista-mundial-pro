import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponsibleGamingNotice } from "@/components/shared/ResponsibleGamingNotice";

describe("ResponsibleGamingNotice", () => {
  it("muestra que el análisis no garantiza resultados", () => {
    render(<ResponsibleGamingNotice />);
    expect(screen.getByText(/no garantiza resultados/i)).toBeInTheDocument();
    expect(screen.getByText(/riesgo de pérdida de dinero/i)).toBeInTheDocument();
  });
});
