import Link from "next/link";
import { ResponsibleGamingNotice } from "@/components/shared/ResponsibleGamingNotice";
import { getProviderStatus } from "@/lib/providers/providerConfig";

export default function ProviderSetupPage() {
  const providers = getProviderStatus();

  return (
    <main className="docs-page">
      <Link className="brand" href="/">
        <span>AMP</span>
        <i />
        <small>
          Analista
          <br />
          Mundial Pro
        </small>
      </Link>

      <section className="docs-hero">
        <span className="section-kicker">Configuración robusta</span>
        <h1>APIs reales sin exponer secretos.</h1>
        <p>
          Las claves se guardan únicamente en `.env` local o en secretos del
          hosting. El frontend solo ve si un proveedor está configurado, nunca
          el valor de la clave.
        </p>
      </section>

      <section className="docs-grid" aria-label="Estado de proveedores">
        {providers.map((provider) => (
          <article className="docs-card" key={provider.id}>
            <span
              className={
                provider.configured
                  ? "provider-dot provider-dot-ok"
                  : "provider-dot provider-dot-missing"
              }
              aria-hidden="true"
            />
            <h2>{provider.label}</h2>
            <p>{provider.purpose}</p>
            <dl>
              <div>
                <dt>Variable</dt>
                <dd>{provider.envName}</dd>
              </div>
              <div>
                <dt>Estado local</dt>
                <dd>{provider.configured ? "Configurada" : "Pendiente"}</dd>
              </div>
            </dl>
            <a href={provider.docsUrl} rel="noreferrer" target="_blank">
              Abrir documentación oficial
            </a>
          </article>
        ))}
      </section>

      <section className="docs-card docs-steps">
        <h2>Pasos seguros</h2>
        <ol>
          <li>Crea la clave en el panel oficial del proveedor.</li>
          <li>Copia `.env.example` a `.env`.</li>
          <li>Pega la clave en la variable correspondiente.</li>
          <li>Reinicia `npm run dev` para que Next.js lea el entorno.</li>
          <li>Prueba `/api/provider-status`; debe mostrar `configured: true`.</li>
        </ol>
        <p>
          Nunca pegues claves reales en commits, issues, chats públicos o
          capturas de pantalla. El repositorio ignora `.env` por diseño.
        </p>
      </section>

      <footer className="home-footer docs-footer">
        <ResponsibleGamingNotice />
      </footer>
    </main>
  );
}
