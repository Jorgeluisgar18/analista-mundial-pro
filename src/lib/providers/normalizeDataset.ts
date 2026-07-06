import type { MatchDataset } from "@/types/domain";

function looksGenericCompetition(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  return ["", "competicion", "competition", "international"].includes(normalized);
}

function looksInternationalNationalMatch(dataset: MatchDataset) {
  return (
    dataset.match.country.toLowerCase().includes("international") ||
    dataset.match.homeTeam.name.toLowerCase().includes("national team") ||
    dataset.match.awayTeam.name.toLowerCase().includes("national team")
  );
}

export function normalizeDatasetMetadata(dataset: MatchDataset): MatchDataset {
  if (
    looksGenericCompetition(dataset.match.competition.name) &&
    looksInternationalNationalMatch(dataset)
  ) {
    return {
      ...dataset,
      match: {
        ...dataset.match,
        competition: {
          ...dataset.match.competition,
          id:
            looksGenericCompetition(dataset.match.competition.id)
              ? "international-world-cup"
              : dataset.match.competition.id,
          name: "International World Cup",
          kind: "NATIONAL",
        },
      },
    };
  }

  return dataset;
}
