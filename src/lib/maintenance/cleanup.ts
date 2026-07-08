type DeleteManyResult = { count: number };

type CleanupDatabase = {
  matchSnapshot: {
    deleteMany(query: unknown): Promise<DeleteManyResult>;
  };
  rateLimitBucket: {
    deleteMany(query: unknown): Promise<DeleteManyResult>;
  };
};

export interface CleanupOldOperationalDataOptions {
  database?: CleanupDatabase;
  now?: Date;
  snapshotRetentionDays?: number;
  rateLimitRetentionHours?: number;
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function subtractHours(date: Date, hours: number) {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

export async function cleanupOldOperationalData({
  database,
  now = new Date(),
  snapshotRetentionDays = 30,
  rateLimitRetentionHours = 24,
}: CleanupOldOperationalDataOptions = {}) {
  const resolvedDatabase =
    database ??
    ((await import("@/lib/db/prisma")).prisma as unknown as CleanupDatabase);
  const snapshotCutoff = subtractDays(now, snapshotRetentionDays);
  const rateLimitCutoff = subtractHours(now, rateLimitRetentionHours);

  const [snapshots, rateLimitBuckets] = await Promise.all([
    resolvedDatabase.matchSnapshot.deleteMany({
      where: {
        fetchedAt: { lt: snapshotCutoff },
      },
    }),
    resolvedDatabase.rateLimitBucket.deleteMany({
      where: {
        resetsAt: { lt: rateLimitCutoff },
      },
    }),
  ]);

  return {
    deletedSnapshots: snapshots.count,
    deletedRateLimitBuckets: rateLimitBuckets.count,
  };
}
