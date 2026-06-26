"use client";

import React from "react";
import type { AnalysisResult } from "@/types/domain";
import { TrendUpIcon, TrendDownIcon } from "@/components/analysis/Icons";

export function EditorialReading({
  analysis,
  subsection,
}: {
  analysis: AnalysisResult;
  subsection: string;
}) {
  return (
    <aside className="editorial-reading">
      <span className="section-kicker">Lectura del analista</span>
      <p>
        {subsection === "Goles"
          ? `El rango central se concentra entre dos y tres goles. ${analysis.match.awayTeam.name} aporta la mayor parte del volumen ofensivo, pero el escenario depende de cuánto tiempo ${analysis.match.homeTeam.name} sostenga su bloque medio.`
          : `La proyección combina volumen reciente, contexto y calidad del rival. El mercado ${subsection.toLowerCase()} conserva sensibilidad alta al primer gol y a las alineaciones.`}
      </p>
      <div className="signal reinforces">
        <TrendUpIcon />
        <div>
          <strong>Señal que refuerza</strong>
          <span>Producción reciente y ventaja de fuerza relativa.</span>
        </div>
      </div>
      <div className="signal weakens">
        <TrendDownIcon />
        <div>
          <strong>Señal que debilita</strong>
          <span>Alineaciones todavía esperadas y varianza del guion.</span>
        </div>
      </div>
    </aside>
  );
}
