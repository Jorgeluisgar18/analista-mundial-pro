import type { ProviderEnvironment } from "@/lib/providers/providerRegistry";

export interface ProviderStatus {
  id:
    | "api-football"
    | "football-data"
    | "the-sportsdb"
    | "odds-api"
    | "open-meteo";
  label: string;
  envName: keyof ProviderEnvironment | "OPEN_METEO_NO_KEY";
  configured: boolean;
  docsUrl: string;
  purpose: string;
}

function hasSecret(value?: string) {
  return Boolean(value?.trim());
}

export function getProviderStatus(
  env: ProviderEnvironment = {
    FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY,
    FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
    THE_SPORTSDB_API_KEY: process.env.THE_SPORTSDB_API_KEY,
    ODDS_API_KEY: process.env.ODDS_API_KEY,
  },
): ProviderStatus[] {
  return [
    {
      id: "api-football",
      label: "API-FOOTBALL / API-Sports",
      envName: "FOOTBALL_API_KEY",
      configured: hasSecret(env.FOOTBALL_API_KEY),
      docsUrl: "https://www.api-football.com/documentation-v3",
      purpose:
        "Fixtures, equipos, ligas, detalles de partido y cobertura amplia internacional.",
    },
    {
      id: "football-data",
      label: "Football-Data.org",
      envName: "FOOTBALL_DATA_API_KEY",
      configured: hasSecret(env.FOOTBALL_DATA_API_KEY),
      docsUrl: "https://www.football-data.org/documentation/quickstart",
      purpose:
        "Calendarios y resultados de ligas europeas top y competiciones UEFA.",
    },
    {
      id: "the-sportsdb",
      label: "TheSportsDB",
      envName: "THE_SPORTSDB_API_KEY",
      configured: hasSecret(env.THE_SPORTSDB_API_KEY),
      docsUrl: "https://www.thesportsdb.com/documentation",
      purpose:
        "Enriquecimiento gratuito secundario: equipos, eventos, estadios, badges y contexto no crítico.",
    },
    {
      id: "odds-api",
      label: "The Odds API",
      envName: "ODDS_API_KEY",
      configured: hasSecret(env.ODDS_API_KEY),
      docsUrl: "https://the-odds-api.com/liveapi/guides/v4/",
      purpose:
        "Cuotas prepartido para value betting, comparación de mercados y surebets.",
    },
    {
      id: "open-meteo",
      label: "Open-Meteo",
      envName: "OPEN_METEO_NO_KEY",
      configured: true,
      docsUrl: "https://open-meteo.com/",
      purpose:
        "Clima estimado por ciudad/sede. No requiere API key para el flujo actual.",
    },
  ];
}

export function hasConfiguredFootballProvider(env?: ProviderEnvironment) {
  const status = getProviderStatus(env);
  return status.some(
    (provider) =>
      ["api-football", "football-data"].includes(provider.id) &&
      provider.configured,
  );
}

export function missingFootballProviderWarning(env?: ProviderEnvironment) {
  if (hasConfiguredFootballProvider(env)) return undefined;
  return "No hay proveedor real de fútbol configurado. Agrega FOOTBALL_API_KEY o FOOTBALL_DATA_API_KEY para consultar calendarios reales.";
}
