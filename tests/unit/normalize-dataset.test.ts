import { describe, expect, it } from "vitest";
import { demoDataset } from "@/data/demo";
import { normalizeDatasetMetadata } from "@/lib/providers/normalizeDataset";

describe("normalizeDatasetMetadata", () => {
  it("repairs generic international competition names from cached datasets", () => {
    const dataset = structuredClone(demoDataset);
    dataset.match.country = "International";
    dataset.match.homeTeam.name = "Sweden National Team";
    dataset.match.awayTeam.name = "Tunisia National Team";
    dataset.match.competition = {
      id: "Competicion",
      name: "Competicion",
      kind: "CLUB",
    };

    const normalized = normalizeDatasetMetadata(dataset);

    expect(normalized.match.competition).toEqual(
      expect.objectContaining({
        id: "international-world-cup",
        name: "International World Cup",
        kind: "NATIONAL",
      }),
    );
  });
});
