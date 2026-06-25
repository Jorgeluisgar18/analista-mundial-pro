import type { Evidence, EvidenceStatus, SourceType } from "@/types/domain";

const PRIORITY: Record<SourceType, number> = {
  official: 4,
  provider: 3,
  manual: 2,
  inferred: 1,
};

function minutesBetween(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000;
}

export function resolveEvidence<T>(items: Evidence<T>[]): Evidence<T> {
  if (items.length === 0) {
    throw new Error("resolveEvidence requires at least one evidence item");
  }

  const official = items
    .filter((item) => item.sourceType === "official")
    .sort(
      (a, b) =>
        new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
    );

  if (
    official.length > 1 &&
    official[0].value !== official[1].value &&
    minutesBetween(official[0].observedAt, official[1].observedAt) <= 15
  ) {
    return {
      ...official[0],
      status: "conflict" satisfies EvidenceStatus,
      note: `Conflicto entre ${official[0].source} y ${official[1].source}`,
    };
  }

  return [...items].sort((a, b) => {
    const priority = PRIORITY[b.sourceType] - PRIORITY[a.sourceType];
    if (priority !== 0) return priority;
    return new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime();
  })[0];
}
