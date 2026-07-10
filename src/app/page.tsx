import Link from "next/link";
import { DateMatchFinder } from "@/components/home/DateMatchFinder";
import { HealthPanel } from "@/components/health/HealthPanel";
import { ResponsibleGamingNotice } from "@/components/shared/ResponsibleGamingNotice";

export default function Home() {
  return (
    <div className="home-page">
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
        <nav aria-label="Navegación principal">
          <a href="#partidos">Partidos</a>
          <a href="#metodologia">Metodología</a>
          <a href="#fuentes">Transparencia</a>
          <a href="#salud">Estado</a>
        </nav>
      </header>
      <main>
        <section className="home-hero">
          <div className="hero-copy">
            <span className="section-kicker">Inteligencia prepartido</span>
            <h1>Lee el partido antes de mirar la cuota.</h1>
            <p>
              Una cabina de análisis futbolístico que combina evidencia,
              contexto táctico y modelos probabilísticos. Diseñada para pensar
              mejor, no para prometer certezas.
            </p>
            <div className="hero-proof">
              <div>
                <strong>Poisson + Dixon–Coles</strong>
                <span>Marcadores y goles</span>
              </div>
              <div>
                <strong>Elo histórico + logística</strong>
                <span>Fuerza, contexto y mercados</span>
              </div>
              <div>
                <strong>Monte Carlo</strong>
                <span>Intervalos y escenarios</span>
              </div>
            </div>
          </div>
          <div className="hero-visual" aria-label="Vista del modelo">
            <div className="radar-orbit orbit-one" />
            <div className="radar-orbit orbit-two" />
            <div className="radar-center">
              <span>Confianza</span>
              <strong>7.1</strong>
              <small>/ 10</small>
            </div>
            <div className="radar-label label-one">
              <span>Probabilidad</span>
              <strong>44%</strong>
              <small>Brasil</small>
            </div>
            <div className="radar-label label-two">
              <span>Goles</span>
              <strong>2.7</strong>
              <small>esperados</small>
            </div>
            <div className="radar-label label-three">
              <span>Datos</span>
              <strong>88%</strong>
              <small>cobertura</small>
            </div>
          </div>
        </section>
        <section className="journey-map" aria-labelledby="journey-title">
          <div className="journey-copy">
            <span className="section-kicker">Flujo recomendado</span>
            <h2 id="journey-title">De la fecha al informe, sin pantallas muertas.</h2>
            <p>
              La web funciona como una cabina de decisión: buscar, validar
              cobertura, abrir análisis, revisar evidencia y ajustar si aparece
              información nueva.
            </p>
          </div>
          <div className="journey-steps">
            <a href="#partidos">
              <span>01</span>
              <strong>Buscar jornada</strong>
              <small>Elige fecha y competición en horario Colombia.</small>
            </a>
            <a href="#salud">
              <span>02</span>
              <strong>Validar cobertura</strong>
              <small>Comprueba APIs, cuota, telemetría y persistencia.</small>
            </a>
            <a href="#metodologia">
              <span>03</span>
              <strong>Entender método</strong>
              <small>Poisson, Elo histórico, logística, Monte Carlo y trazabilidad.</small>
            </a>
            <Link href="/docs/provider-setup">
              <span>04</span>
              <strong>Configurar fuentes</strong>
              <small>Activa datos reales sin exponer claves en el cliente.</small>
            </Link>
          </div>
        </section>
        <div id="partidos">
          <DateMatchFinder initialDate="2026-06-15" />
        </div>
        <section className="principles" id="metodologia">
          <article>
            <span>01</span>
            <h2>Probabilidades explicables</h2>
            <p>
              Cada mercado conserva motivo, riesgo, intervalo y fuente. La
              narrativa nunca decide la cifra.
            </p>
          </article>
          <article>
            <span>02</span>
            <h2>Datos con estado</h2>
            <p>
              Confirmado, esperado, inferido, conflictivo o no disponible. Lo
              desconocido permanece visible.
            </p>
          </article>
          <article id="fuentes">
            <span>03</span>
            <h2>Transparencia total</h2>
            <p>
              Cada predicción muestra su fuente, el momento de captura y el
              nivel de certeza. Lo desconocido aparece como desconocido.
            </p>
          </article>
        </section>
        <HealthPanel />
      </main>
      <footer className="home-footer">
        <ResponsibleGamingNotice />
        <p>Analista Mundial Pro · Análisis prepartido probabilístico</p>
      </footer>
    </div>
  );
}
