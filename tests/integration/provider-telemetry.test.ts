import { afterEach, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { describeWithDatabase } from "../helpers/database";

vi.mock("server-only", () => ({}));

const provider = `API-Football-test-${Date.now()}`;

afterEach(async () => {
  await prisma.providerTelemetry.deleteMany({ where: { provider } });
});

describeWithDatabase("Provider telemetry", () => {
  it("summarizes provider failures and latency without exposing secrets", async () => {
    const { recordProviderTelemetry, getProviderTelemetrySnapshot } =
      await import("@/lib/services/providerTelemetryService");

    await recordProviderTelemetry({
      provider,
      operation: "fixtures",
      status: "success",
      latencyMs: 240,
      occurredAt: new Date(),
    });
    await recordProviderTelemetry({
      provider,
      operation: "fixtures",
      status: "error",
      latencyMs: 900,
      occurredAt: new Date(),
      errorCode: "429",
    });

    const snapshot = await getProviderTelemetrySnapshot();
    const row = snapshot.find((item) => item.provider === provider);

    expect(JSON.stringify(snapshot)).not.toContain("f946");
    expect(row).toMatchObject({
      provider,
      total: 2,
      failures: 1,
    });
    expect(row?.averageLatencyMs).toBeGreaterThan(0);
  });
});
