import { describe, expect, it } from "vitest";
import { GET as getMatches } from "@/app/api/matches/route";

describe("API routes", () => {
  it("rechaza una fecha inválida", async () => {
    const response = await getMatches(
      new Request("http://local/api/matches?date=25-06-2026"),
    );
    expect(response.status).toBe(400);
  });

  it("devuelve partidos demo normalizados", async () => {
    const response = await getMatches(
      new Request("http://local/api/matches?date=2026-06-15"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matches[0].id).toBe("demo-col-bra");
    expect(body.mode).toBe("demo");
  });
});
