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

export function nextUsageValue(currentUsed: number, reportedUsed?: number) {
  return reportedUsed === undefined
    ? { increment: 1 }
    : Math.max(currentUsed, reportedUsed);
}

export async function recordApiUsage(event: ProviderUsageEvent) {
  const occurredAt = event.occurredAt ?? new Date();
  const { periodKey, resetsAt } = periodBounds(event.period, occurredAt);
  const reportedUsed =
    event.used ??
    (event.remaining === undefined
      ? undefined
      : Math.max(0, event.limit - event.remaining));
  const where = {
    provider_periodKey: {
      provider: event.provider,
      periodKey,
    },
  };
  const existing =
    reportedUsed === undefined
      ? null
      : await prisma.apiUsage.findUnique({
          where,
          select: { used: true },
        });

  await prisma.apiUsage.upsert({
    where,
    update: {
      period: event.period,
      used: nextUsageValue(existing?.used ?? 0, reportedUsed),
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

export function selectActiveUsageRecords<
  T extends {
    provider: string;
    resetsAt: Date;
  },
>(records: T[], now = new Date()) {
  const activeByProvider = new Map<string, T>();

  for (const record of records) {
    if (
      record.resetsAt.getTime() > now.getTime() &&
      !activeByProvider.has(record.provider)
    ) {
      activeByProvider.set(record.provider, record);
    }
  }

  return [...activeByProvider.values()];
}

export async function getApiUsageSnapshot() {
  const records = await prisma.apiUsage.findMany({
    orderBy: [{ updatedAt: "desc" }, { provider: "asc" }],
  });
  return selectActiveUsageRecords(records).map((record) => ({
    provider: record.provider,
    used: record.used,
    limit: record.limit,
    period: record.period as UsagePeriod,
    periodKey: record.periodKey,
    resetsAt: record.resetsAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }));
}
