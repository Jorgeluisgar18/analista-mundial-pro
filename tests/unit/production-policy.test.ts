import { describe, expect, it } from "vitest";
import {
  createRuntimePolicy,
  DemoDataUnavailableInProductionError,
  isProductionDataUnavailableError,
  ProductionDataUnavailableError,
} from "@/lib/runtime/productionPolicy";

describe("production runtime policy", () => {
  it("bloquea datos demo en producción con un error 503", () => {
    const policy = createRuntimePolicy({ NODE_ENV: "production" });

    expect(policy.isProduction).toBe(true);
    expect(policy.allowsDemoData).toBe(false);
    expect(() => policy.assertDemoAllowed()).toThrow(
      DemoDataUnavailableInProductionError,
    );

    try {
      policy.assertDemoAllowed();
    } catch (error) {
      expect(error).toMatchObject({ status: 503 });
    }
  });

  it.each(["development", "test"] as const)(
    "permite fixtures demo en %s",
    (NODE_ENV) => {
      const policy = createRuntimePolicy({ NODE_ENV });

      expect(policy.isProduction).toBe(false);
      expect(policy.allowsDemoData).toBe(true);
      expect(() => policy.assertDemoAllowed()).not.toThrow();
    },
  );

  it("expone errores operativos 503 con detalle público seguro opcional", () => {
    const error = new ProductionDataUnavailableError(
      "Los datos reales no están disponibles.",
      "Intenta nuevamente más tarde.",
    );

    expect(error).toMatchObject({
      name: "ProductionDataUnavailableError",
      status: 503,
      publicDetail: "Intenta nuevamente más tarde.",
    });

    expect(
      new ProductionDataUnavailableError(
        "Los datos reales no están disponibles.",
      ).publicDetail,
    ).toBeUndefined();
  });

  it("reconoce ambos errores de indisponibilidad de producción", () => {
    const demoError = new DemoDataUnavailableInProductionError();
    const dataError = new ProductionDataUnavailableError(
      "Los datos reales no están disponibles.",
    );

    expect(isProductionDataUnavailableError(demoError)).toBe(true);
    expect(isProductionDataUnavailableError(dataError)).toBe(true);
    expect(isProductionDataUnavailableError(new Error("fallo ajeno"))).toBe(
      false,
    );
  });
});
