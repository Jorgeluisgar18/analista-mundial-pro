"use client";

import React from "react";
import { TeamVisual } from "@/components/shared/TeamVisual";
import { APP_TIME_ZONE_ABBREVIATION } from "@/lib/time/colombia";
import type { AnalysisResult } from "@/types/domain";

function matchMetaText(match: AnalysisResult["match"]) {
  const originLabel =
    match.dataOrigin === "DEMO" ? "Muestra local" : "Datos reales";
  return `${match.date} · ${match.time} ${APP_TIME_ZONE_ABBREVIATION} · ${match.venue} · ${originLabel}`;
}

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
          <TeamVisual
            team={match.homeTeam}
            competitionKind={match.competition.kind}
            side="home"
            size="hero"
          />
          <strong>{match.homeTeam.name}</strong>
        </div>
        <i>×</i>
        <div>
          <strong>{match.awayTeam.name}</strong>
          <TeamVisual
            team={match.awayTeam}
            competitionKind={match.competition.kind}
            side="away"
            size="hero"
          />
        </div>
      </div>
      <p>{matchMetaText(match)}</p>
      <span className="match-status">Análisis preliminar</span>
      {analysis.manuallyUpdated ? (
        <span className="manual-update-label">
          Análisis actualizado manualmente
        </span>
      ) : null}
    </header>
  );
}
