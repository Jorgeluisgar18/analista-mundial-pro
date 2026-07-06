import { expect, test } from "@playwright/test";
import pg from "pg";

function hasPostgresDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return Boolean(
    databaseUrl &&
      !databaseUrl.startsWith("file:") &&
      databaseUrl.startsWith("postgres"),
  );
}

async function deleteManualOverride(description: string) {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return;

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await pool.query(
      'DELETE FROM "ManualOverride" WHERE "description" = $1',
      [description],
    );
  } finally {
    await pool.end();
  }
}

test("busca y analiza un partido demo", async ({ page }) => {
  await page.route("**/api/matches?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mode: "demo",
        source: "Muestra local de respaldo",
        fetchedAt: "2026-07-02T12:00:00.000Z",
        warnings: [
          "Sin cobertura real disponible: se muestra una muestra local claramente identificada.",
        ],
        providerStatus: [],
        matches: [
          {
            id: "demo-col-bra",
            date: "2026-06-15",
            time: "17:00",
            kickoff: "2026-06-15T22:00:00.000Z",
            status: "preliminary",
            homeTeam: {
              id: "col",
              name: "Colombia",
              code: "COL",
              colors: ["#f5c842", "#163e8c"],
              flag: "🇨🇴",
            },
            awayTeam: {
              id: "bra",
              name: "Brasil",
              code: "BRA",
              colors: ["#f5d547", "#1d8f4b"],
              flag: "🇧🇷",
            },
            competition: {
              id: "wc-2026",
              name: "FIFA World Cup",
              kind: "NATIONAL",
              stage: "Grupo D",
            },
            venue: "MetLife Stadium",
            city: "East Rutherford",
            country: "Estados Unidos",
            timezone: "America/Bogota",
            dataOrigin: "DEMO",
            fetchedAt: "2026-07-02T12:00:00.000Z",
          },
        ],
      }),
    });
  });

  await page.goto("/");
  await expect(page).toHaveTitle(/Analista Mundial Pro/);
  await page.locator('input[aria-label="Fecha"]').fill("2026-06-15");
  await page.getByRole("button", { name: "Buscar partidos" }).click();
  await page.getByText("Colombia vs Brasil").click();
  await expect(page).toHaveURL(/\/match\/demo-col-bra/);
  await expect(
    page.getByRole("heading", { name: "Lectura ejecutiva" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /05 · Mercados/i }).click();
  await page.getByRole("button", { name: "Goles", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mercado de goles" }),
  ).toBeVisible();
});

test("la búsqueda muestra estado visible en lugar de quedar en blanco", async ({
  page,
}) => {
  let releaseMatchesResponse!: () => void;
  const delayedMatchesResponse = new Promise<void>((resolve) => {
    releaseMatchesResponse = resolve;
  });

  await page.route("**/api/matches?**", async (route) => {
    await delayedMatchesResponse;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mode: "demo",
        source: "Muestra local de respaldo",
        warnings: [],
        matches: [],
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[aria-label="Fecha"]').fill("2026-06-15");
  await page.getByRole("button", { name: "Buscar partidos" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Consultando proveedores sin exponer claves en el navegador",
  );

  releaseMatchesResponse();
  await expect(
    page
      .getByText(/partidos encontrados|Muestra local|Datos reales/)
      .first(),
  ).toBeVisible();
});

test("la home comunica estado de datos y metodología sin parecer demo plana", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Poisson + Dixon–Coles")).toBeVisible();
  await expect(page.getByText("Elo + logística")).toBeVisible();
  await expect(page.getByText("Estado del sistema")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Buscar partidos" }),
  ).toBeVisible();
});

test("la guía de proveedores es una pantalla real y no una redirección muerta", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Configurar fuentes/i }).click();
  await expect(page).toHaveURL(/\/docs\/provider-setup/);
  await expect(
    page.getByRole("heading", {
      name: /Activa datos reales sin exponer tus claves/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "FOOTBALL_API_KEY" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "THE_SPORTSDB_API_KEY" }),
  ).toBeVisible();
});

test("modifica manualmente un partido cuando Postgres está configurado", async ({
  page,
}) => {
  test.skip(
    !hasPostgresDatabaseUrl(),
    "Requiere DATABASE_URL con Neon/Postgres para persistir overrides.",
  );

  const description = `Baja E2E temporal ${Date.now()}`;
  try {
    await page.goto("/match/demo-col-bra");
    await page.getByRole("button", { name: /Cambios manuales/i }).click();
    await page.getByLabel("Descripción del cambio").fill(description);
    await page.getByRole("button", { name: /Guardar y recalcular/i }).click();
    await expect(
      page.getByText("Análisis actualizado manualmente").first(),
    ).toBeVisible();
  } finally {
    await deleteManualOverride(description);
  }
});

test("exporta un HTML autónomo", async ({ page }) => {
  await page.goto("/match/demo-col-bra");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Descargar informe/i }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("colombia-vs-brasil");
});
