import { prisma } from "@/lib/db/prisma";

export interface ProviderTelemetryEvent {
  provider: string;
  operation: string;
  status: "success" | "error" | "cache";
  latencyMs: number;
  errorCode?: string;
  occurredAt?: Date;
}

export async function recordProviderTelemetry(event: ProviderTelemetryEvent) {
  await prisma.providerTelemetry.create({
    data: {
      provider: event.provider,
      operation: event.operation,
      status: event.status,
      latencyMs: event.latencyMs,
      errorCode: event.errorCode,
      occurredAt: event.occurredAt ?? new Date(),
    },
  });
}

export async function getProviderTelemetrySnapshot() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const records = await prisma.providerTelemetry.findMany({
    where: { occurredAt: { gte: since } },
    orderBy: { occurredAt: "desc" },
  });

  const grouped = new Map<string, typeof records>();
  for (const record of records) {
    grouped.set(record.provider, [...(grouped.get(record.provider) ?? []), record]);
  }

  return Array.from(grouped.entries()).map(([provider, items]) => ({
    provider,
    total: items.length,
    failures: items.filter((item) => item.status === "error").length,
    averageLatencyMs: Math.round(
      items.reduce((sum, item) => sum + item.latencyMs, 0) /
        Math.max(1, items.length),
    ),
    lastObservedAt: items[0]?.occurredAt.toISOString() ?? null,
  }));
}
