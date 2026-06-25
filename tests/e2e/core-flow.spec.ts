import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";

test("busca, analiza y modifica un partido", async ({ page }) => {
  const description = `Baja E2E temporal ${Date.now()}`;
  try {
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
    await page.getByRole("button", { name: /Cambios manuales/i }).click();
    await page.getByLabel("Descripción del cambio").fill(description);
    await page.getByRole("button", { name: /Guardar y recalcular/i }).click();
    await expect(
      page.getByText("Análisis actualizado manualmente").first(),
    ).toBeVisible();
  } finally {
    const database = new Database("prisma/dev.db");
    database
      .prepare("DELETE FROM ManualOverride WHERE description = ?")
      .run(description);
    database.close();
  }
});

test("exporta un HTML autónomo", async ({ page }) => {
  await page.goto("/match/demo-col-bra");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportar HTML/i }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("colombia-vs-brasil");
});
