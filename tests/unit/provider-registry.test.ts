import { describe, expect, it } from "vitest";
import { createProviderRegistry } from "@/lib/providers/providerRegistry";

describe("provider registry", () => {
  it("registra Footballdata.io sin sustituir Football-Data.org", () => {
    const registry = createProviderRegistry({
      FOOTBALL_API_KEY: "",
      FOOTBALL_DATA_API_KEY: "football-data-org-token",
      FOOTBALLDATA_IO_API_KEY: "footballdata-io-token",
    });

    expect(registry.football.map((provider) => provider.id)).toEqual([
      "football-data",
      "footballdata-io",
    ]);
  });
});
