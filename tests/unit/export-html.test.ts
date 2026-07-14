import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { renderAnalysisHtml } from "@/lib/export/renderAnalysisHtml";

describe("renderAnalysisHtml", () => {
  it("genera HTML autónomo sin secretos", () => {
    const html = renderAnalysisHtml(analyzeMatch(demoDataset));
    expect(html.toLowerCase()).toContain("<!doctype html>");
    expect(html).toContain("Este análisis es probabilístico");
    expect(html).not.toContain("FOOTBALL_API_KEY");
    expect(html).not.toContain("OPENAI_API_KEY");
  });
  it("muestra horario Colombia en el encabezado exportado", () => {
    const html = renderAnalysisHtml(analyzeMatch(demoDataset));

    expect(html).toContain("17:00 COT");
    expect(html).toContain("Snapshot");
    expect(html).not.toMatch(/Snapshot \d{4}-\d{2}-\d{2}T/);
  });

  it("incluye bloques criticos del informe completo", () => {
    const html = renderAnalysisHtml(analyzeMatch(demoDataset));

    expect(html).toContain("Escenarios");
    expect(html).toContain("Alertas");
    expect(html).toContain("Calibraci");
    expect(html).toContain("Calidad de datos");
    expect(html).toContain("Valor esperado");
    expect(html).toContain("Surebets");
  });

  it("incluye trazabilidad del modelo y sus componentes", () => {
    const html = renderAnalysisHtml(analyzeMatch(demoDataset));

    expect(html).toContain("Trazabilidad del modelo");
    expect(html).toContain("Versi");
    expect(html).toContain("Poisson + Dixon-Coles");
    expect(html).toContain("Monte Carlo");
    expect(html).toContain("Regresi");
  });

  it("exporta una lectura visualmente auditable de evidencia por mercado", () => {
    const html = renderAnalysisHtml(analyzeMatch(demoDataset));

    expect(html).toContain("Ruta de lectura");
    expect(html).toContain("Evidencia por mercado");
    expect(html).toContain("Lectura del mercado");
    expect(html).toContain("Fuentes usadas");
    expect(html).toContain("Cuota disponible");
    expect(html).toContain("Ventaja del modelo");
    expect(html).toContain("Rango probable");
    expect(html).toContain("@media print");
  });

  it("incluye alineaciones, jugadores y contexto historico cuando recibe dataset", () => {
    const dataset = structuredClone(demoDataset);
    dataset.historical = {
      homeForm: {
        matches: 8,
        weightedPointsPerGame: 1.88,
        strengthAdjustedPointsPerGame: 1.71,
        goalsFor: 1.5,
        goalsAgainst: 0.9,
        cleanSheetRate: 0.38,
        source: "historical",
      },
      awayForm: {
        matches: 10,
        weightedPointsPerGame: 2.05,
        strengthAdjustedPointsPerGame: 1.94,
        goalsFor: 2.1,
        goalsAgainst: 0.8,
        cleanSheetRate: 0.44,
        source: "historical",
      },
    };

    const html = renderAnalysisHtml(analyzeMatch(dataset), dataset);

    expect(html).toContain("Alineaciones y disponibilidad");
    expect(html).toContain("XI esperado");
    expect(html).toContain("Scouting de referencia");
    expect(html).toContain("Vargas");
    expect(html).toContain("Jugadores clave");
    expect(html).toContain("Titular esperado");
    expect(html).toContain("Luis Díaz");
    expect(html).toContain("Contexto histórico");
    expect(html).toContain("8 partidos históricos");
    expect(html).toContain("forma ponderada 1.88");
    expect(html).toContain("ajustada por rival 1.71");
  });
});
