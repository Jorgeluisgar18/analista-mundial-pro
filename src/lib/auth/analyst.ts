import { problem } from "@/lib/http/problem";
import { getAdminAuthorization } from "@/lib/auth/server";

export async function requireAnalyst(_request: Request) {
  void _request; // Authorization uses the SDK session, never request token headers.
  const authorization = await getAdminAuthorization();
  if (authorization === "authorized") return null;
  if (authorization === "unavailable") {
    return problem(
      503,
      "Edición manual no disponible",
      "El acceso de administrador no está disponible en este momento.",
    );
  }
  if (authorization === "forbidden") {
    return problem(
      403,
      "Acceso no autorizado",
      "Solo la cuenta administradora verificada puede guardar cambios manuales.",
    );
  }
  return problem(
    401,
    "Sesión de administrador requerida",
    "Inicia sesión con la cuenta administradora para guardar cambios manuales.",
  );
}
