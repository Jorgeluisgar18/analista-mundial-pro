import {
  emitUsage,
  type Fetcher,
  type ProviderResult,
  type UsageReporter,
} from "@/lib/providers/types";
import type { Evidence } from "@/types/domain";

export class OpenMeteoProvider {
  readonly id = "open-meteo";

  constructor(
    private readonly fetcher: Fetcher = fetch,
    private readonly usageReporter?: UsageReporter,
  ) {}

  async getWeatherForLocation(
    city: string,
    country: string,
    kickoff: string,
  ): Promise<ProviderResult<Evidence<string>>> {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", city);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "es");
    url.searchParams.set("format", "json");
    const response = await this.fetcher(url, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    await emitUsage(this.usageReporter, {
      provider: "Open-Meteo",
      period: "fair-use",
      limit: 10_000,
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo geocoding respondió ${response.status}`);
    }
    const body = (await response.json()) as {
      results?: Array<{
        latitude: number;
        longitude: number;
        name: string;
        country?: string;
      }>;
    };
    const normalizedCountry = country.toLowerCase();
    const location =
      body.results?.find((candidate) =>
        candidate.country?.toLowerCase().includes(normalizedCountry),
      ) ?? body.results?.[0];
    if (!location) {
      return this.unavailable(
        `No se encontraron coordenadas para ${city}, ${country}.`,
      );
    }
    return this.getWeather(location.latitude, location.longitude, kickoff);
  }

  async getWeather(
    latitude: number,
    longitude: number,
    kickoff: string,
  ): Promise<ProviderResult<Evidence<string>>> {
    const utcKickoff = new Date(kickoff).toISOString();
    const date = utcKickoff.slice(0, 10);
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set(
      "hourly",
      "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability",
    );
    url.searchParams.set("start_date", date);
    url.searchParams.set("end_date", date);
    url.searchParams.set("timezone", "UTC");
    const response = await this.fetcher(url, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    await emitUsage(this.usageReporter, {
      provider: "Open-Meteo",
      period: "fair-use",
      limit: 10_000,
    });
    if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`);
    const body = (await response.json()) as {
      hourly?: {
        time: string[];
        temperature_2m: number[];
        relative_humidity_2m: number[];
        wind_speed_10m: number[];
        precipitation_probability: number[];
      };
    };
    const targetHour = utcKickoff.slice(0, 13);
    const index =
      body.hourly?.time.findIndex((time) => time.startsWith(targetHour)) ?? -1;
    const value =
      index >= 0 && body.hourly
        ? `${body.hourly.temperature_2m[index]} °C, humedad ${body.hourly.relative_humidity_2m[index]} %, viento ${body.hourly.wind_speed_10m[index]} km/h, lluvia ${body.hourly.precipitation_probability[index]} %`
        : "Dato no disponible en la fuente actual";
    return {
      data: {
        value,
        status: index >= 0 ? "expected" : "unavailable",
        sourceType: "provider",
        source: "Open-Meteo",
        observedAt: new Date().toISOString(),
      },
      meta: {
        source: "Open-Meteo",
        fetchedAt: new Date().toISOString(),
        isStale: false,
        warnings: index >= 0 ? [] : ["Hora del partido fuera del pronóstico."],
      },
    };
  }

  private unavailable(warning: string): ProviderResult<Evidence<string>> {
    const observedAt = new Date().toISOString();
    return {
      data: {
        value: "Dato no disponible en la fuente actual",
        status: "unavailable",
        sourceType: "provider",
        source: "Open-Meteo",
        observedAt,
      },
      meta: {
        source: "Open-Meteo",
        fetchedAt: observedAt,
        isStale: false,
        warnings: [warning],
      },
    };
  }
}
