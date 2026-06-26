"use client";

import React from "react";
import type { AnalysisResult } from "@/types/domain";

export function MatchHero({ analysis }: { analysis: AnalysisResult }) {
  const match = analysis.match;
  return (
    <header className="match-hero">
      <div className="match-hero-light" />
      <span className="section-kicker">
        {match.competition.name} · {match.competition.stage}
      </span>
      <div className="match-versus">
        <div>
          <span className="team-flag">{match.homeTeam.flag ?? match.homeTeam.code}</span>
          <strong>{match.homeTeam.name}</strong>
        </div>
        <i>×</i>
        <div>
          <strong>{match.awayTeam.name}</strong>
          <span className="team-flag">{match.awayTeam.flag ?? match.awayTeam.code}</span>
        </div>
      </div>
      <p>
        {match.date} · {match.time} · {match.venue} ·{" "}
        {match.dataOrigin === "DEMO" ? "Datos demostrativos" : "Datos reales"}
      </p>
      <span className="match-status">Análisis preliminar</span>
      {analysis.manuallyUpdated ? (
        <span className="manual-update-label">
          Análisis actualizado manualmente
        </span>
      ) : null}
    </header>
  );
}
