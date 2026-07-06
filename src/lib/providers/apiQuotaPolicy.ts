import type { UsagePeriod } from "@/lib/providers/types";

export interface ApiUsageSnapshotRecord {
  provider: string;
  used: number;
  limit: number;
  period: UsagePeriod;
  periodKey: string;
  resetsAt: string;
  updatedAt: string;
}

export function apiQuotaDecision(
  usage: ApiUsageSnapshotRecord | undefined,
  { reserve = 10 }: { reserve?: number } = {},
) {
  if (!usage) {
    return {
      shouldCall: true,
      reason: "Sin telemetría previa; se permite una consulta controlada.",
    };
  }

  const remaining = Math.max(0, usage.limit - usage.used);
  if (remaining <= reserve) {
    return {
      shouldCall: false,
      remaining,
      reason: `Reserva ${usage.period} protegida: quedan ${remaining}/${usage.limit} requests y la reserva configurada es ${reserve}.`,
    };
  }

  return {
    shouldCall: true,
    remaining,
    reason: `Quedan ${remaining}/${usage.limit} requests (${usage.period}), por encima de la reserva ${reserve}.`,
  };
}
