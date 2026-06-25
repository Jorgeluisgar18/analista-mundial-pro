import "server-only";
import { getAnalysis } from "@/lib/services/analysisService";

export async function refreshMatch(matchId: string) {
  const refreshed = await getAnalysis(matchId, { persist: true });
  if (!refreshed) return null;
  return {
    ...refreshed,
    refreshedAt: new Date().toISOString(),
    refreshedFields: [
      "estado",
      "alineaciones",
      "bajas",
      "cuotas",
      "estadísticas",
    ],
  };
}
