import { getApiUsageSnapshot } from "@/lib/services/apiUsageService";

export async function GET() {
  const usage = await getApiUsageSnapshot();
  return Response.json({
    usage,
    configured: {
      "API-Football": Boolean(process.env.FOOTBALL_API_KEY),
      "Football-Data.org": Boolean(process.env.FOOTBALL_DATA_API_KEY),
      "Footballdata.io": Boolean(process.env.FOOTBALLDATA_IO_API_KEY),
      TheSportsDB: Boolean(process.env.THE_SPORTSDB_API_KEY),
      "The Odds API": Boolean(process.env.ODDS_API_KEY),
      "Open-Meteo": true,
    },
    checkedAt: new Date().toISOString(),
  });
}
