import { describe, expect, it, vi } from "vitest";
import { OpenMeteoProvider } from "@/lib/providers/openMeteo";

describe("OpenMeteoProvider", () => {
  it("resuelve la ciudad y consulta la hora UTC del partido", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      if (url.hostname === "geocoding-api.open-meteo.com") {
        return Response.json({
          results: [
            {
              latitude: 40.8339,
              longitude: -74.0976,
              name: "East Rutherford",
              country: "United States",
            },
          ],
        });
      }
      return Response.json({
        hourly: {
          time: ["2026-08-15T22:00"],
          temperature_2m: [24],
          relative_humidity_2m: [61],
          wind_speed_10m: [13],
          precipitation_probability: [20],
        },
      });
    });
    const provider = new OpenMeteoProvider(fetcher as typeof fetch);

    const result = await provider.getWeatherForLocation(
      "East Rutherford",
      "Estados Unidos",
      "2026-08-15T18:00:00-04:00",
    );
    const forecastUrl = new URL(String(fetcher.mock.calls[1]?.[0]));

    expect(forecastUrl.searchParams.get("timezone")).toBe("UTC");
    expect(result.data.status).toBe("expected");
    expect(result.data.value).toContain("24 °C");
    expect(result.meta.warnings).toEqual([]);
  });
});
