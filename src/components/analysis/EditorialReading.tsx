"use client";

import React from "react";
import type { AnalysisResult } from "@/types/domain";
import { TrendUpIcon, TrendDownIcon } from "@/components/analysis/Icons";

function categorySignal(analysis: AnalysisResult, subsection: string) {
  const home = analysis.match.homeTeam.name;
  const away = analysis.match.awayTeam.name;
  if (subsection === "Goles") {
    return `Total esperado ${analysis.expected.goals.toFixed(2)}: ${home} aporta ${analysis.expected.homeGoals.toFixed(2)} xG y ${away} ${analysis.expected.awayGoals.toFixed(2)} xG.`;
  }
  if (subsection === "Corners") {
    return `Base de corners ${analysis.expected.corners.toFixed(1)}: el mercado depende del dominio territorial y de si el equipo que persigue el marcador aumenta centros.`;
  }
  if (subsection === "Tarjetas") {
    return `Base disciplinaria ${analysis.expected.cards.toFixed(1)}: subiría con presión competitiva, árbitro estricto o desventaja temprana.`;
  }
  return `La lectura combina probabilidades 1X2 (${analysis.mainProbabilities.home.toFixed(1)} / ${analysis.mainProbabilities.draw.toFixed(1)} / ${analysis.mainProbabilities.away.toFixed(1)}) con cobertura ${analysis.dataQuality.coverage}%.`;
}

export function EditorialReading({
  analysis,
  subsection,
}: {
  analysis: AnalysisResult;
  subsection: string;
}) {
  const confirmed = analysis.dataQuality.lineupConfirmed;
  return (
    <aside className="editorial-reading">
      <span className="section-kicker">Lectura del analista</span>
      <p>{categorySignal(analysis, subsection)}</p>
      <div className="signal reinforces">
        <TrendUpIcon />
        <div>
          <strong>Señal que refuerza</strong>
          <span>
            Datos de forma, producción y mercado alineados con el snapshot
            actual del partido.
          </span>
        </div>
      </div>
      <div className="signal weakens">
        <TrendDownIcon />
        <div>
          <strong>Señal que debilita</strong>
          <span>
            {confirmed
              ? "Aunque hay alineaciones confirmadas, eventos tempranos pueden romper el guion."
              : "Alineaciones aún no confirmadas: recalcular cerca de la hora oficial."}
          </span>
        </div>
      </div>
    </aside>
  );
}
