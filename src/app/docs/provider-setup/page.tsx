import Link from "next/link";

const providers = [
  {
    name: "Neon Postgres",
    variable: "DATABASE_URL",
    use: "Persistencia durable para snapshots, cuotas, imports, uso de APIs y overrides.",
  },
  {
    name: "API-FOOTBALL / API-Sports",
    variable: "FOOTBALL_API_KEY",
    use: "Fixtures, equipos, ligas, detalles de partido y cobertura internacional amplia.",
  },
  {
    name: "Football-Data.org",
    variable: "FOOTBALL_DATA_API_KEY",
    use: "Calendarios y resultados de ligas europeas top y competiciones UEFA.",
  },
  {
    name: "Footballdata.io",
    variable: "FOOTBALLDATA_IO_API_KEY",
    use: "Proveedor complementario para fixtures, resultados y rankings con plan gratuito.",
  },
  {
    name: "TheSportsDB",
    variable: "THE_SPORTSDB_API_KEY",
    use: "Enriquecimiento secundario: badges, equipos, eventos, estadios y contexto.",
  },
  {
    name: "The Odds API",
    variable: "ODDS_API_KEY + ODDS_API_MARKETS",
    use: "Cuotas para value betting y surebets con flujo conservador: events gratis antes de odds pagado.",
  },
  {
    name: "Open-Meteo",
    variable: "Sin clave",
    use: "Clima estimado por ciudad o sede.",
  },
];

export default function ProviderSetupPage() {
  return (
    <div className="home-page provider-doc-page">
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
        <nav aria-label="Navegación de documentación">
          <Link href="/#partidos">Partidos</Link>
          <Link href="/#salud">Estado</Link>
          <Link href="/">Inicio</Link>
        </nav>
      </header>

      <main className="provider-doc">
        <section className="provider-doc-hero">
          <span className="section-kicker">Configuración segura</span>
          <h1>Activa datos reales sin exponer tus claves.</h1>
          <p>
            Esta guía resume qué variables usar, para qué sirve cada proveedor y
            cómo comprobar que la app está lista para trabajar con datos reales
            dentro del plan gratuito.
          </p>
          <div className="provider-doc-actions">
            <Link className="primary-button" href="/#salud">
              Ver estado actual
            </Link>
            <Link className="secondary-button" href="/#partidos">
              Probar búsqueda
            </Link>
          </div>
        </section>

        <section className="provider-doc-grid" aria-label="Pasos de configuración">
          <article>
            <span>01</span>
            <h2>Configura variables seguras</h2>
            <p>
              Usa `.env.local` en desarrollo y el panel seguro de Netlify en
              producción. No uses variables `NEXT_PUBLIC_*` para secretos.
            </p>
          </article>
          <article>
            <span>02</span>
            <h2>Reinicia y verifica</h2>
            <p>
              Reinicia `npm run dev`, abre `/api/provider-status` y confirma que
              el proveedor aparece como configurado.
            </p>
          </article>
          <article>
            <span>03</span>
            <h2>Respeta la cuota gratis</h2>
            <p>
              Busca por fecha/liga antes de abrir varios partidos y evita
              refrescar repetidamente el mismo informe.
            </p>
          </article>
        </section>

        <section className="provider-doc-panel">
          <div>
            <span className="section-kicker">Variables principales</span>
            <h2>Plantilla base</h2>
            <p>
              Copia solo las variables que realmente usarás. Las claves reales
              nunca deben quedar en commits, issues ni documentación pública.
            </p>
          </div>
          <pre aria-label="Plantilla de variables de entorno">{`DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/neondb?sslmode=require"
FOOTBALL_API_KEY=""
FOOTBALL_DATA_API_KEY=""
FOOTBALLDATA_IO_API_KEY=""
FOOTBALLDATA_IO_BASE_URL="https://footballdata.io/api/v1"
THE_SPORTSDB_API_KEY=""
THE_SPORTSDB_BASE_URL="https://www.thesportsdb.com/api/v1/json"
THE_SPORTSDB_TIMEOUT_MS="8000"
ODDS_API_KEY=""
ODDS_API_REGIONS="eu"
ODDS_API_MARKETS="h2h"
ODDS_API_TIMEOUT_MS="8000"`}</pre>
        </section>

        <section className="provider-table-section">
          <span className="section-kicker">Mapa de proveedores</span>
          <h2>Qué activa cada fuente</h2>
          <div className="provider-table" role="table" aria-label="Proveedores y variables">
            {providers.map((provider) => (
              <div className="provider-row" role="row" key={provider.name}>
                <strong role="cell">{provider.name}</strong>
                <code role="cell">{provider.variable}</code>
                <span role="cell">{provider.use}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="provider-doc-panel provider-doc-panel--compact">
          <div>
            <span className="section-kicker">Checklist final</span>
            <h2>Antes de producción</h2>
          </div>
          <ul>
            <li>`/api/health` debe mostrar base de datos conectada en producción.</li>
            <li>`/api/provider-status` debe reflejar las claves configuradas.</li>
            <li>Las búsquedas sin cobertura deben explicar el motivo, no quedar en blanco.</li>
            <li>Si una clave se expone accidentalmente, rótala de inmediato.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
