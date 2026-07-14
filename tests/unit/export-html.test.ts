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
});
