type RuntimeEnvironment = Pick<NodeJS.ProcessEnv, "NODE_ENV">;

export class DemoDataUnavailableInProductionError extends Error {
  readonly status = 503;

  constructor() {
    super("Los datos de demostración no están disponibles en producción.");
    this.name = "DemoDataUnavailableInProductionError";
  }
}

export class ProductionDataUnavailableError extends Error {
  readonly status = 503;

  constructor(message: string, readonly publicDetail?: string) {
    super(message);
    this.name = "ProductionDataUnavailableError";
  }
}

export function isProductionDataUnavailableError(
  error: unknown,
): error is
  | DemoDataUnavailableInProductionError
  | ProductionDataUnavailableError {
  return (
    error instanceof DemoDataUnavailableInProductionError ||
    error instanceof ProductionDataUnavailableError
  );
}

export function createRuntimePolicy(env: RuntimeEnvironment = process.env) {
  const isProduction = env.NODE_ENV === "production";

  return {
    isProduction,
    allowsDemoData: !isProduction,
    assertDemoAllowed() {
      if (!isProduction) return;
      throw new DemoDataUnavailableInProductionError();
    },
  };
}
