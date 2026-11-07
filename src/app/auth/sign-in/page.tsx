import Link from "next/link";
import { signInAction, signOutAction } from "@/app/auth/sign-in/actions";
import { getAdminAuthorization } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [{ error }, authorization] = await Promise.all([
    searchParams,
    getAdminAuthorization(),
  ]);
  const errorCode = Array.isArray(error) ? error[0] : error;
  const message =
    errorCode === "unavailable" || authorization === "unavailable"
      ? "El acceso no está disponible en este momento."
      : errorCode === "credentials"
        ? "No se pudo iniciar sesión con esas credenciales."
        : errorCode === "signout"
          ? "No se pudo cerrar la sesión. Inténtalo nuevamente."
          : null;

  return (
    <main className="home-page auth-page">
      <header className="home-header">
        <Link className="brand" href="/">
          <span>AMP</span>
          <i />
          <small>
            Analista
            <br />
            Mundial Pro
          </small>
        </Link>
        <Link href="/">Volver al inicio</Link>
      </header>
      <section className="auth-content" aria-labelledby="admin-access-title">
        <div className="auth-card">
          <span className="section-kicker">Acceso privado</span>
          <h1 id="admin-access-title">Administración</h1>
          {message && <p role="alert">{message}</p>}
          {authorization === "authorized" ? (
            <>
              <p role="status">La sesión de administrador está activa.</p>
              <form action={signOutAction}>
                <button className="secondary-button" type="submit">
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <p>
                Inicia sesión con la cuenta autorizada para administrar el
                análisis.
              </p>
              <form action={signInAction} className="auth-form">
                <label>
                  <span>Correo electrónico</span>
                  <input
                    autoComplete="username"
                    name="email"
                    required
                    type="email"
                  />
                </label>
                <label>
                  <span>Contraseña</span>
                  <input
                    autoComplete="current-password"
                    name="password"
                    required
                    type="password"
                  />
                </label>
                <button className="primary-button" type="submit">
                  Iniciar sesión
                </button>
              </form>
              <p className="auth-footnote">
                La aplicación no ofrece registro de usuarios. Solo la cuenta
                configurada como administradora puede crear cambios manuales.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
