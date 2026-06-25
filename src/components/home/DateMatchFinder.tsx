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
}

export function DateMatchFinder({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [competition, setCompetition] = useState("all");
  const [result, setResult] = useState<MatchSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchMatches() {
    setLoading(true);
    setError("");
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
      {error ? <p className="form-error">{error}</p> : null}
      {result ? (
        <div className="search-result" aria-live="polite">
          <div className="result-meta">
            <span className={`origin-label origin-${result.mode}`}>
              {result.mode === "demo" ? "Modo demostración" : "Datos de API"}
            </span>
            <span>{result.source}</span>
            <span>{result.matches.length} partidos</span>
          </div>
          {result.matches.length ? (
            <div className="match-list">
              {result.matches.map((match) => (
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
          ) : (
            <div className="empty-state">
              No hay partidos disponibles para esta fecha.
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
