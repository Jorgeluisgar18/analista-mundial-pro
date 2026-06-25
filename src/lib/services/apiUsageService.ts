import { prisma } from "@/lib/db/prisma";
import type {
  ProviderUsageEvent,
  UsagePeriod,
} from "@/lib/providers/types";

function periodBounds(period: UsagePeriod, occurredAt: Date) {
  const year = occurredAt.getUTCFullYear();
  const month = occurredAt.getUTCMonth();
  const day = occurredAt.getUTCDate();
  const hour = occurredAt.getUTCHours();
  const minute = occurredAt.getUTCMinutes();

  if (period === "minute") {
    return {
      periodKey: occurredAt.toISOString().slice(0, 16),
      resetsAt: new Date(Date.UTC(year, month, day, hour, minute + 1)),
    };
  }
  if (period === "month") {
    return {
      periodKey: occurredAt.toISOString().slice(0, 7),
      resetsAt: new Date(Date.UTC(year, month + 1, 1)),
    };
  }
  return {
    periodKey: occurredAt.toISOString().slice(0, 10),
    resetsAt: new Date(Date.UTC(year, month, day + 1)),
  };
}

export async function recordApiUsage(event: ProviderUsageEvent) {
  const occurredAt = event.occurredAt ?? new Date();
  const { periodKey, resetsAt } = periodBounds(event.period, occurredAt);
  const reportedUsed =
    event.used ??
    (event.remaining === undefined
      ? undefined
      : Math.max(0, event.limit - event.remaining));

  await prisma.apiUsage.upsert({
    where: {
      provider_periodKey: {
        provider: event.provider,
        periodKey,
      },
    },
    update: {
      period: event.period,
      used:
        reportedUsed === undefined ? { increment: 1 } : reportedUsed,
      limit: event.limit,
      resetsAt,
    },
    create: {
      provider: event.provider,
      period: event.period,
      periodKey,
      used: reportedUsed ?? 1,
      limit: event.limit,
      resetsAt,
    },
  });
}

export async function getApiUsageSnapshot() {
  const records = await prisma.apiUsage.findMany({
    orderBy: [{ updatedAt: "desc" }, { provider: "asc" }],
  });
  return records.map((record) => ({
    provider: record.provider,
    used: record.used,
    limit: record.limit,
    period: record.period as UsagePeriod,
    periodKey: record.periodKey,
    resetsAt: record.resetsAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }));
}
