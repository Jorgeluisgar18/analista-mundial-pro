import { describe, expect, it } from "vitest";
import { cleanupOldOperationalData } from "@/lib/maintenance/cleanup";

describe("cleanupOldOperationalData", () => {
  it("borra snapshots antiguos y buckets de rate limit expirados", async () => {
    const calls: unknown[] = [];
    const database = {
      matchSnapshot: {
        deleteMany: async (query: unknown) => {
          calls.push(["matchSnapshot", query]);
          return { count: 4 };
        },
      },
      rateLimitBucket: {
        deleteMany: async (query: unknown) => {
          calls.push(["rateLimitBucket", query]);
          return { count: 9 };
        },
      },
    };

    const result = await cleanupOldOperationalData({
      database,
      now: new Date("2026-07-08T12:00:00.000Z"),
      snapshotRetentionDays: 30,
      rateLimitRetentionHours: 24,
    });

    expect(result).toEqual({
      deletedSnapshots: 4,
      deletedRateLimitBuckets: 9,
    });
    expect(calls).toEqual([
      [
        "matchSnapshot",
        {
          where: {
            fetchedAt: { lt: new Date("2026-06-08T12:00:00.000Z") },
          },
        },
      ],
      [
        "rateLimitBucket",
        {
          where: {
            resetsAt: { lt: new Date("2026-07-07T12:00:00.000Z") },
          },
        },
      ],
    ]);
  });
});
