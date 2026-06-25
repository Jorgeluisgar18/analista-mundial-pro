import { problem } from "@/lib/http/problem";

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const expectedOrigin = new URL(request.url).origin;
  if (origin === expectedOrigin) return null;

  return problem(
    403,
    "Origen no permitido",
    "La operación solo puede iniciarse desde esta aplicación.",
  );
}
