import "server-only";
import { cacheDecision } from "@/lib/cache/cachePolicy";
import { prisma } from "@/lib/db/prisma";
import type { MatchDataset, SourceRecord } from "@/types/domain";

interface SnapshotDatabase {
  match: {
    findUnique(args: {
      where: { externalId: string };
      include: {
        snapshots: {
          orderBy: { fetchedAt: "desc" };
          take: number;
        };
      };
    }): Promise<{
      snapshots: Array<{
        payload: string;
        fetchedAt: Date;
        isStale: boolean;
      }>;
    } | null>;
  };
}

function cacheSource(fetchedAt: Date): SourceRecord {
  return {
    id: "match-snapshot-cache-hit",
    label: "Caché persistente",
    type: "provider",
    status: "confirmed",
    observedAt: fetchedAt.toISOString(),
    detail:
      "Dataset reutilizado desde MatchSnapshot; no se invocó el proveedor principal.",
  };
}

function isFreshEnough(dataset: MatchDataset, fetchedAt: Date, now: Date) {
  const resources = [
    cacheDecision({
      resource: "match",
      kickoff: dataset.match.kickoff,
      observedAt: fetchedAt.toISOString(),
      now,
    }),
    cacheDecision({
      resource: "stats",
      kickoff: dataset.match.kickoff,
      observedAt: fetchedAt.toISOString(),
      now,
    }),
    cacheDecision({
      resource: "injuries",
      kickoff: dataset.match.kickoff,
      observedAt: fetchedAt.toISOString(),
      now,
    }),
    cacheDecision({
      resource: "lineups",
      kickoff: dataset.match.kickoff,
      observedAt: fetchedAt.toISOString(),
      now,
      confirmed:
        dataset.lineups.length > 0 &&
        dataset.lineups.every((lineup) => lineup.confirmed),
    }),
  ];

  return resources.every((resource) => !resource.shouldRefresh);
}

export function createMatchSnapshotCache({
  database = prisma,
  now = () => new Date(),
}: {
  database?: SnapshotDatabase;
  now?: () => Date;
} = {}) {
  return {
    async getFreshDataset(matchId: string): Promise<MatchDataset | null> {
      let match;
      try {
        match = await database.match.findUnique({
          where: { externalId: matchId },
          include: {
            snapshots: {
              orderBy: { fetchedAt: "desc" },
              take: 3,
            },
          },
        });
      } catch {
        return null;
      }
      if (!match) return null;

      for (const snapshot of match.snapshots) {
        if (snapshot.isStale) continue;
        try {
          const dataset = JSON.parse(snapshot.payload) as MatchDataset;
          if (!isFreshEnough(dataset, snapshot.fetchedAt, now())) continue;
          return {
            ...dataset,
            sources: [...dataset.sources, cacheSource(snapshot.fetchedAt)],
          };
        } catch {
          // Un payload corrupto no debe impedir probar snapshots anteriores.
        }
      }

      return null;
    },
  };
}

export type MatchSnapshotCache = ReturnType<typeof createMatchSnapshotCache>;
