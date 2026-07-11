import Image from "next/image";
import type { CSSProperties } from "react";
import type { CompetitionKind, TeamRef } from "@/types/domain";

type TeamVisualSize = "compact" | "hero";

interface TeamVisualProps {
  team: TeamRef;
  competitionKind: CompetitionKind;
  side?: "home" | "away";
  size?: TeamVisualSize;
}

function visualLabel(team: TeamRef, competitionKind: CompetitionKind) {
  return competitionKind === "NATIONAL"
    ? `Bandera de ${team.name}`
    : `Escudo de ${team.name}`;
}

const countryCodeByTeamName: Record<string, string> = {
  alemania: "de",
  argentina: "ar",
  austria: "at",
  "bélgica": "be",
  belgica: "be",
  belgium: "be",
  brazil: "br",
  brasil: "br",
  colombia: "co",
  croacia: "hr",
  croatia: "hr",
  dinamarca: "dk",
  denmark: "dk",
  ecuador: "ec",
  england: "gb-eng",
  españa: "es",
  espana: "es",
  "estados unidos": "us",
  francia: "fr",
  france: "fr",
  germany: "de",
  inglaterra: "gb-eng",
  italia: "it",
  italy: "it",
  marruecos: "ma",
  "méxico": "mx",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  "países bajos": "nl",
  "paises bajos": "nl",
  portugal: "pt",
  spain: "es",
  "south africa": "za",
  "united states": "us",
  uruguay: "uy",
};

function normalizeTeamNameForFlag(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(men'?s|women'?s)\b/gu, "")
    .replace(/\b(national|team|selection|seleccion|seleccion nacional)\b/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function flagUrlFor(team: TeamRef) {
  if (/^[a-z]{2}$/i.test(team.code)) {
    return `https://flagcdn.com/w80/${team.code.toLowerCase()}.png`;
  }

  const normalizedName = normalizeTeamNameForFlag(team.name);
  const countryCode = countryCodeByTeamName[normalizedName];
  return countryCode ? `https://flagcdn.com/w80/${countryCode}.png` : undefined;
}

export function TeamVisual({
  team,
  competitionKind,
  side = "home",
  size = "compact",
}: TeamVisualProps) {
  const fallback = team.flag ?? team.code;
  const visualUrl =
    competitionKind === "NATIONAL" ? flagUrlFor(team) ?? team.logoUrl : team.logoUrl;
  const className = [
    "team-visual",
    `team-visual--${size}`,
    `team-visual--${side}`,
    visualUrl ? "team-visual--image" : "team-visual--fallback",
  ].join(" ");

  return (
    <span
      className={className}
      style={{
        "--team-primary": team.colors[0],
        "--team-secondary": team.colors[1],
      } as CSSProperties}
    >
      {visualUrl ? (
        <Image
          src={visualUrl}
          alt={visualLabel(team, competitionKind)}
          fill
          sizes={size === "hero" ? "72px" : "34px"}
          loading="eager"
          className="team-visual-image"
        />
      ) : (
        <span className="team-visual-fallback" aria-hidden="true">
          {fallback}
        </span>
      )}
    </span>
  );
}
