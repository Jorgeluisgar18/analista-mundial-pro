import Link from "next/link";
import { DateMatchFinder } from "@/components/home/DateMatchFinder";
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
          <a href="#fuentes">Fuentes</a>
          <Link href="/docs/provider-setup">APIs</Link>
        </nav>
        <span className="local-mode">Local · Privado</span>
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
                <strong>Elo + logística</strong>
                <span>Fuerza y mercados</span>
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
            <h2>Gratis y extensible</h2>
            <p>
              API-Football, Football-Data.org, The Odds API y Open-Meteo son
              adaptadores opcionales; el modo demo funciona desde el inicio.
            </p>
          </article>
        </section>
      </main>
      <footer className="home-footer">
        <ResponsibleGamingNotice />
        <p>Analista Mundial Pro · Herramienta personal local-first</p>
      </footer>
    </div>
  );
}
