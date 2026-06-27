const baseUrl =
  process.env.SMOKE_BASE_URL ?? "https://shiny-torte-4f01e2.netlify.app";

async function readJson(path: string) {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${path} failed with ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  return JSON.parse(text) as unknown;
}

function assertObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} did not return an object`);
  }
}

async function main() {
  const health = await readJson("/api/health");
  assertObject(health, "health");

  if (health.database !== "connected") {
    throw new Error(
      `database is not connected: ${String(health.database ?? "unknown")}`,
    );
  }

  const providers = await readJson("/api/provider-status");
  assertObject(providers, "provider-status");

  const matches = await readJson("/api/matches?date=2026-06-15");
  assertObject(matches, "matches");

  if (!Array.isArray(matches.matches)) {
    throw new Error("matches response does not include a matches array");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        database: health.database,
        matchCount: matches.matches.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
