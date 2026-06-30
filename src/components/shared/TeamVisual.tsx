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
  "bélgica": "be",
  belgica: "be",
  brasil: "br",
  colombia: "co",
  croacia: "hr",
  dinamarca: "dk",
  ecuador: "ec",
  españa: "es",
  espana: "es",
  "estados unidos": "us",
  francia: "fr",
  inglaterra: "gb-eng",
  italia: "it",
  marruecos: "ma",
  "méxico": "mx",
  mexico: "mx",
  "países bajos": "nl",
  "paises bajos": "nl",
  portugal: "pt",
  uruguay: "uy",
};

function flagUrlFor(team: TeamRef) {
  if (/^[a-z]{2}$/i.test(team.code)) {
    return `https://flagcdn.com/w80/${team.code.toLowerCase()}.png`;
  }

  const normalizedName = team.name.trim().toLowerCase();
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
