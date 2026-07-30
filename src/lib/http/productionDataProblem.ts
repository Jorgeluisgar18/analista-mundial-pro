import { problem } from "@/lib/http/problem";
import {
  DemoDataUnavailableInProductionError,
  ProductionDataUnavailableError,
} from "@/lib/runtime/productionPolicy";

export function productionDataProblem(
  error: ProductionDataUnavailableError | DemoDataUnavailableInProductionError,
) {
  return problem(
    503,
    "Datos reales no disponibles",
    error instanceof ProductionDataUnavailableError
      ? (error.publicDetail ?? "Los datos reales no están disponibles en este momento.")
      : "Los datos reales no están disponibles en este momento.",
  );
}
