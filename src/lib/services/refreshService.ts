import "server-only";
import { getAnalysis as defaultGetAnalysis } from "@/lib/services/analysisService";

interface RefreshOptions {
  bypassCache?: boolean;
}

interface RefreshAnalysisService {
  getAnalysis: typeof defaultGetAnalysis;
}

export function createRefreshService({
  analysisService = { getAnalysis: defaultGetAnalysis },
}: {
  analysisService?: RefreshAnalysisService;
} = {}) {
  return {
    async refreshMatch(matchId: string, options: RefreshOptions = {}) {
      const refreshed = await analysisService.getAnalysis(matchId, {
        persist: true,
        bypassCache: Boolean(options.bypassCache),
      });
      if (!refreshed) return null;

      return {
        ...refreshed,
        refreshedAt: new Date().toISOString(),
        refreshMode: options.bypassCache ? "provider" : "cache-aware",
        refreshedFields: [
          "estado",
          "alineaciones",
          "bajas",
          "cuotas",
          "estadísticas",
        ],
      };
    },
  };
}

export const { refreshMatch } = createRefreshService();
