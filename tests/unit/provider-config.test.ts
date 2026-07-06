import { describe, expect, it } from "vitest";
import {
  getProviderStatus,
  hasConfiguredFootballProvider,
} from "@/lib/providers/providerConfig";

describe("providerConfig", () => {
  it("reporta proveedores configurados sin exponer secretos", () => {
    const status = getProviderStatus({
      FOOTBALL_API_KEY: "api-football-secret",
      FOOTBALL_DATA_API_KEY: "",
      FOOTBALLDATA_IO_API_KEY: "footballdata-io-secret",
      THE_SPORTSDB_API_KEY: "sportsdb-secret",
      ODDS_API_KEY: "odds-secret",
    });

    expect(status).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "api-football",
          envName: "FOOTBALL_API_KEY",
          configured: true,
        }),
        expect.objectContaining({
          id: "football-data",
          envName: "FOOTBALL_DATA_API_KEY",
          configured: false,
        }),
        expect.objectContaining({
          id: "footballdata-io",
          envName: "FOOTBALLDATA_IO_API_KEY",
          configured: true,
        }),
        expect.objectContaining({
          id: "the-sportsdb",
          envName: "THE_SPORTSDB_API_KEY",
          configured: true,
        }),
        expect.objectContaining({
          id: "odds-api",
          envName: "ODDS_API_KEY",
          configured: true,
        }),
      ]),
    );
    expect(JSON.stringify(status)).not.toContain("api-football-secret");
    expect(JSON.stringify(status)).not.toContain("footballdata-io-secret");
    expect(JSON.stringify(status)).not.toContain("sportsdb-secret");
    expect(JSON.stringify(status)).not.toContain("odds-secret");
  });

  it("detecta si hay al menos un proveedor real de fútbol", () => {
    expect(
      hasConfiguredFootballProvider({
        FOOTBALL_API_KEY: "",
        FOOTBALL_DATA_API_KEY: "",
        FOOTBALLDATA_IO_API_KEY: "",
      }),
    ).toBe(false);

    expect(
      hasConfiguredFootballProvider({
        FOOTBALL_DATA_API_KEY: "token",
      }),
    ).toBe(true);

    expect(
      hasConfiguredFootballProvider({
        FOOTBALLDATA_IO_API_KEY: "token",
      }),
    ).toBe(true);
  });
});
