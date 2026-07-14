import { expect, test } from "@playwright/test";

test.describe("responsive layout", () => {
  test("la cabina móvil conserva navegación y acciones", async ({ page }) => {
    await page.goto("/match/demo-col-bra");
    await expect(page.getByText("Colombia").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Actualizar/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Abrir panel de cambios manuales/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Descargar informe en HTML/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Mercados/i }).first().click();
    await page.getByRole("button", { name: "Pestaña Goles" }).click();
    await expect(
      page.getByRole("heading", { name: "Mercado de goles" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test("la barra móvil no tapa el contenido al final de la cabina", async ({ page }) => {
    await page.goto("/match/demo-col-bra");
    await page.getByRole("button", { name: /Fuentes/i }).first().click();
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const bar = document.querySelector(".mobile-actionbar");
          const content = document.querySelector(".analysis-content");
          const lastContent = content?.querySelector(
            ".analysis-section > :last-child",
          );
          if (!bar || !lastContent) return true;
          const barTop = bar.getBoundingClientRect().top;
          const contentBottom = lastContent.getBoundingClientRect().bottom;
          return contentBottom > barTop - 12;
        }),
      )
      .toBe(false);
  });

  test("la home no tiene desborde horizontal en tablet [768px]", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/");
    await expect(page.getByText("Poisson + Dixon–Coles")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test("la cabina no tiene desborde horizontal en tablet [768px]", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/match/demo-col-bra");
    await expect(page.getByText("Colombia").first()).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test("la home no tiene desborde horizontal en desktop [1440px]", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByText("Poisson + Dixon–Coles")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
