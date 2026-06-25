import { expect, test } from "@playwright/test";

test("la cabina móvil conserva navegación y acciones", async ({ page }) => {
  await page.goto("/match/demo-col-bra");
  await expect(page.getByText("Colombia").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Actualizar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cambios", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mercados", exact: true }).click();
  await page.getByRole("button", { name: "Pestaña Goles" }).click();
  await expect(page.getByRole("heading", { name: "Mercado de goles" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
