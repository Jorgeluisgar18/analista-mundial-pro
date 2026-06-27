"use client";

import Link from "next/link";
import { useState } from "react";
import { supportedCompetitions } from "@/lib/providers/competitionCatalog";
import type { NormalizedMatch } from "@/types/domain";

interface MatchSearchResponse {
  mode: "api" | "demo";
  source: string;
  warnings: string[];
  matches: NormalizedMatch[];
  providerStatus?: Array<{
    id: string;
    label: string;
    envName: string;
    configured: boolean;
    docsUrl: string;
    purpose: string;
  }>;
}

const INITIAL_VISIBLE_MATCHES = 20;
const VISIBLE_MATCH_INCREMENT = 20;

export function DateMatchFinder({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [competition, setCompetition] = useState("all");
  const [result, setResult] = useState<MatchSearchResponse | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MATCHES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchMatches() {
    setLoading(true);
    setError("");
    setVisibleCount(INITIAL_VISIBLE_MATCHES);
    try {
      const params = new URLSearchParams({ date, competition });
      const response = await fetch(`/api/matches?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? "No fue posible consultar.");
      setResult(body);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Error de consulta inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }

  const visibleMatches = result?.matches.slice(0, visibleCount) ?? [];
  const hiddenMatchCount = result
    ? Math.max(0, result.matches.length - visibleMatches.length)
    : 0;

  return (
    <section className="finder" aria-labelledby="finder-title">
      <div className="finder-heading">
        <div>
          <span className="section-kicker">Centro de partidos</span>
          <h2 id="finder-title">Selecciona la jornada que quieres estudiar</h2>
        </div>
        <p>
          El modo demostración permite probar el flujo sin claves. Los datos
          reales se consultan únicamente desde el servidor.
        </p>
      </div>
      <div className="finder-controls">
        <label>
          <span>Fecha</span>
          <input
            aria-label="Fecha"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          <span>Competición</span>
          <select
            aria-label="Competición"
            value={competition}
            onChange={(event) => setCompetition(event.target.value)}
          >
            <option value="all">Todas las competiciones</option>
            {supportedCompetitions.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary-button"
          type="button"
          onClick={searchMatches}
          disabled={loading}
        >
          <SearchIcon />
          {loading ? "Consultando…" : "Buscar partidos"}
        </button>
      </div>
      {loading ? (
        <p className="finder-loading" role="status">
          Consultando proveedores sin exponer claves en el navegador…
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {result ? (
        <div className="search-result" aria-live="polite">
          <div className="result-meta">
            <span className={`origin-label origin-${result.mode}`}>
              {result.mode === "demo" ? "Modo demostración" : "Datos de API"}
            </span>
            <span>{result.source}</span>
            <span>
              {result.matches.length} partidos encontrados
              {hiddenMatchCount > 0 ? ` · mostrando ${visibleMatches.length}` : ""}
            </span>
          </div>
          <div className="result-quality-chips" aria-label="Calidad de datos">
            <span>Origen: {result.mode === "api" ? "API" : "Demo"}</span>
            <span>Fuente: {result.source}</span>
            <span>Filtro: {competition === "all" ? "Global" : competition}</span>
          </div>
          {result.matches.length ? (
            <>
              <div className="match-list">
                {visibleMatches.map((match) => (
                  <Link
                    className="match-row"
                    href={`/match/${match.id}`}
                    key={match.id}
                  >
                    <span className="match-time">{match.time}</span>
                    <span className="match-teams">
                      <strong>
                        {match.homeTeam.name} vs {match.awayTeam.name}
                      </strong>
                      <small>
                        {match.competition.name} ·{" "}
                        {match.competition.stage ?? "Fase no disponible"}
                      </small>
                    </span>
                    <span className="match-venue">{match.venue}</span>
                    <ArrowIcon />
                  </Link>
                ))}
              </div>
              {hiddenMatchCount > 0 ? (
                <button
                  className="secondary-button load-more-matches"
                  type="button"
                  onClick={() =>
                    setVisibleCount(
                      (currentCount) => currentCount + VISIBLE_MATCH_INCREMENT,
                    )
                  }
                >
                  Mostrar 20 más
                </button>
              ) : null}
            </>
          ) : (
            <div className="empty-state empty-state-diagnostic">
              <div>
                <span className="section-kicker">
                  Sin cobertura para este filtro
                </span>
                <h3>No encontramos partidos para esta fecha y competición.</h3>
                <p>
                  El modo demo solo cubre partidos de muestra, como el
                  2026-06-15 en FIFA World Cup. Para calendarios reales de
                  ligas top, Mundial y competiciones UEFA, configura al menos
                  una API de fútbol real.
                </p>
              </div>
              {result.providerStatus?.length ? (
                <div className="provider-checklist" aria-label="Estado de APIs">
                  {result.providerStatus.map((provider) => (
                    <div className="provider-check" key={provider.id}>
                      <span
                        className={
                          provider.configured
                            ? "provider-dot provider-dot-ok"
                            : "provider-dot provider-dot-missing"
                        }
                        aria-hidden="true"
                      />
                      <div>
                        <strong>{provider.label}</strong>
                        <small>
                          {provider.configured
                            ? "Configurada"
                            : `Pendiente: ${provider.envName}`}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="empty-actions">
                <Link className="secondary-button" href="/docs/provider-setup">
                  Ver guía de APIs
                </Link>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setDate("2026-06-15");
                    setCompetition("wc-2026");
                  }}
                >
                  Usar fecha demo
                </button>
              </div>
            </div>
          )}
          {result.warnings.length ? (
            <details className="data-warnings">
              <summary>Notas sobre la consulta</summary>
              <ul>
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="row-arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}
