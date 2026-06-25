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
});
