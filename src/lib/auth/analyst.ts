import { timingSafeEqual } from "node:crypto";
import { problem } from "@/lib/http/problem";

const ANALYST_HEADER = "x-analyst-token";

function configuredToken() {
  return process.env.ANALYST_OVERRIDE_TOKEN?.trim();
}

function submittedToken(request: Request) {
  const headerToken = request.headers.get(ANALYST_HEADER)?.trim();
  if (headerToken) return headerToken;

  const authorization = request.headers.get("authorization")?.trim();
  const [scheme, token] = authorization?.split(/\s+/, 2) ?? [];
  if (scheme?.toLowerCase() === "bearer" && token?.trim()) {
    return token.trim();
  }

  return undefined;
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function requireAnalyst(request: Request) {
  const expected = configuredToken();
  if (!expected) {
    return problem(
      503,
      "Edición manual no configurada",
      "Configura ANALYST_OVERRIDE_TOKEN en el entorno seguro antes de permitir cambios manuales.",
    );
  }

  const received = submittedToken(request);
  if (!received || !safeEquals(received, expected)) {
    return problem(
      401,
      "Credencial de analista requerida",
      "Los cambios manuales requieren un token de analista válido.",
    );
  }

  return null;
}
