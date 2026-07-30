import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { FootballDataProvider } from "@/lib/providers/footballData";
import { describeWithDatabase } from "../helpers/database";

vi.mock("server-only", () => ({}));

const provider = `test-provider-${Date.now()}`;

afterEach(async () => {
  await prisma.apiUsage.deleteMany({ where: { provider } });
});

describeWithDatabase("API usage telemetry", () => {
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

  it("no retrocede el consumo si el proveedor reporta un valor menor", async () => {
    const { recordApiUsage, getApiUsageSnapshot } = await import(
      "@/lib/services/apiUsageService"
    );
    const occurredAt = new Date("2026-06-25T16:00:00Z");

    await recordApiUsage({
      provider,
      period: "day",
      limit: 100,
      used: 10,
      occurredAt,
    });
    await recordApiUsage({
      provider,
      period: "day",
      limit: 100,
      used: 7,
      occurredAt,
    });

    const row = (await getApiUsageSnapshot()).find(
      (item) => item.provider === provider,
    );

    expect(row?.used).toBe(10);
  });
});

describe("API usage telemetry sin persistencia", () => {
  it("mantiene exitosa la consulta deportiva cuando falla persistir el uso", async () => {
    const fetcher = vi.fn(async () => Response.json({ matches: [] }));
    const usageReporter = vi
      .fn()
      .mockRejectedValue(new Error("Postgres no disponible"));
    const provider = new FootballDataProvider(
      "test-token",
      fetcher as typeof fetch,
      usageReporter,
    );

    const result = await provider.listMatches("2026-08-15");

    expect(result.data).toEqual([]);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(usageReporter).toHaveBeenCalledOnce();
    expect(usageReporter).toHaveBeenCalledWith({
      provider: "Football-Data.org",
      period: "minute",
      limit: 10,
    });
  });
});
