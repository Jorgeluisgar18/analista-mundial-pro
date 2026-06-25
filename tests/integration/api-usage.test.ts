import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";

vi.mock("server-only", () => ({}));

const provider = `test-provider-${Date.now()}`;

afterEach(async () => {
  await prisma.apiUsage.deleteMany({ where: { provider } });
});

describe("API usage telemetry", () => {
  it("incrementa llamadas y respeta el consumo informado por el proveedor", async () => {
    const usageModule = await import("@/lib/services/apiUsageService");
    const recordApiUsage = Reflect.get(
      usageModule,
      "recordApiUsage",
    ) as (event: {
      provider: string;
      period: "day";
      limit: number;
      used?: number;
      occurredAt: Date;
    }) => Promise<void>;
    const getApiUsageSnapshot = Reflect.get(
      usageModule,
      "getApiUsageSnapshot",
    ) as () => Promise<
      Array<{ provider: string; used: number; limit: number; period: string }>
    >;
    const occurredAt = new Date("2026-06-25T16:00:00Z");

    await recordApiUsage({
      provider,
      period: "day",
      limit: 100,
      occurredAt,
    });
    await recordApiUsage({
      provider,
      period: "day",
      limit: 100,
      occurredAt,
    });
    await recordApiUsage({
      provider,
      period: "day",
      limit: 100,
      used: 7,
      occurredAt,
    });

    const snapshot = await getApiUsageSnapshot();
    const row = snapshot.find((item) => item.provider === provider);

    expect(row).toMatchObject({
      provider,
      used: 7,
      limit: 100,
      period: "day",
    });
  });
});
