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
  await page.goto("/");
  await expect(page).toHaveTitle(/Analista Mundial Pro/);
  await page.getByLabel("Fecha").fill("2026-06-15");
  await page.getByRole("button", { name: "Buscar partidos" }).click();
  await page.getByText("Colombia vs Brasil").click();
  await expect(page).toHaveURL(/\/match\/demo-col-bra/);
  await expect(
    page.getByRole("heading", { name: "Mercado de goles" }),
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
        source: "Datos demostrativos locales",
        warnings: [],
        matches: [],
      }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Fecha").fill("2026-06-15");
  await page.getByRole("button", { name: "Buscar partidos" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Consultando proveedores sin exponer claves en el navegador",
  );

  releaseMatchesResponse();
  await expect(
    page
      .getByText(/partidos encontrados|Modo demostración|Datos de API/)
      .first(),
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
