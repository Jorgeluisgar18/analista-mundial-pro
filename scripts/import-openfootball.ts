import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { normalizeOpenFootballMatch } from "@/lib/openfootball/normalize";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
const prisma = databaseUrl
  ? new PrismaClient({ adapter: new PrismaPg(databaseUrl) })
  : undefined;
const sourceFile = process.env.OPENFOOTBALL_SOURCE_FILE;
const sourceRepo =
  (process.env.OPENFOOTBALL_SOURCE_REPO as
    | "openfootball/football.json"
    | "openfootball/worldcup.json"
    | undefined) ?? "openfootball/worldcup.json";
const sourceCommit = process.env.OPENFOOTBALL_SOURCE_COMMIT ?? "local-cache";
const competitionName =
  process.env.OPENFOOTBALL_COMPETITION_NAME ?? "OpenFootball";
const season = process.env.OPENFOOTBALL_SEASON ?? "unknown";

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function points(goalsFor: number, goalsAgainst: number) {
  if (goalsFor > goalsAgainst) return 3;
  if (goalsFor === goalsAgainst) return 1;
  return 0;
}

function kickoffDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function main() {
  if (!sourceFile) {
    console.log(
      JSON.stringify({
        ok: true,
        imported: false,
        note: "Set OPENFOOTBALL_SOURCE_FILE to import a local cached JSON file.",
      }),
    );
    return;
  }
  if (!prisma) {
    throw new Error(
      "DATABASE_URL no está configurada. Define la conexión Neon/Postgres antes de importar OpenFootball.",
    );
  }

  const raw = JSON.parse(await readFile(sourceFile, "utf8")) as {
    matches?: unknown[];
    rounds?: Array<{ name?: string; matches?: unknown[] }>;
  };
  const rawMatches =
    raw.matches ??
    raw.rounds?.flatMap((round) =>
      (round.matches ?? []).map((match) => ({ round: round.name, match })),
    ) ??
    [];
  const sourcePath = process.env.OPENFOOTBALL_SOURCE_PATH ?? basename(sourceFile);

  const competition = await prisma.competition.upsert({
    where: { externalId: `openfootball:${slug(competitionName)}` },
    update: { name: competitionName, kind: "CLUB" },
    create: {
      externalId: `openfootball:${slug(competitionName)}`,
      name: competitionName,
      kind: "CLUB",
    },
  });
  const importRun = await prisma.historicalImport.upsert({
    where: {
      sourceRepo_sourceCommit_sourcePath: {
        sourceRepo,
        sourceCommit,
        sourcePath,
      },
    },
    update: {
      matchCount: rawMatches.length,
      rawMeta: JSON.stringify({ sourceFile, competitionName, season }),
    },
    create: {
      sourceRepo,
      sourceCommit,
      sourcePath,
      matchCount: rawMatches.length,
      rawMeta: JSON.stringify({ sourceFile, competitionName, season }),
    },
  });

  let importedMatches = 0;
  for (const [index, item] of rawMatches.entries()) {
    const rawMatch =
      item && typeof item === "object" && "match" in item
        ? (item as { match: Record<string, unknown>; round?: string }).match
        : (item as Record<string, unknown>);
    const round =
      item && typeof item === "object" && "round" in item
        ? String((item as { round?: unknown }).round ?? "")
        : undefined;
    const normalized = normalizeOpenFootballMatch({
      rawMatch,
      sourceRepo,
      sourceCommit,
      sourcePath,
      sourceIndex: index,
      competitionName,
      season,
      round,
    });
    if (!normalized.scoreFullTime) continue;

    const [homeGoals, awayGoals] = normalized.scoreFullTime;
    const [homeTeam, awayTeam] = await Promise.all([
      prisma.team.upsert({
        where: { externalId: `openfootball:${slug(normalized.homeTeamName)}` },
        update: { name: normalized.homeTeamName, kind: "CLUB" },
        create: {
          externalId: `openfootball:${slug(normalized.homeTeamName)}`,
          name: normalized.homeTeamName,
          code: normalized.homeTeamName.slice(0, 3).toUpperCase(),
          kind: "CLUB",
        },
      }),
      prisma.team.upsert({
        where: { externalId: `openfootball:${slug(normalized.awayTeamName)}` },
        update: { name: normalized.awayTeamName, kind: "CLUB" },
        create: {
          externalId: `openfootball:${slug(normalized.awayTeamName)}`,
          name: normalized.awayTeamName,
          code: normalized.awayTeamName.slice(0, 3).toUpperCase(),
          kind: "CLUB",
        },
      }),
    ]);

    const historicalMatch = await prisma.historicalMatch.upsert({
      where: { externalId: normalized.externalId },
      update: {
        homeGoals,
        awayGoals,
        rawJson: JSON.stringify(normalized.rawJson),
      },
      create: {
        externalId: normalized.externalId,
        sourceRepo,
        sourcePath,
        sourceIndex: index,
        season,
        round: normalized.round,
        group: normalized.group,
        kickoff: kickoffDate(normalized.kickoffDate),
        kickoffDate: normalized.kickoffDate,
        homeGoals,
        awayGoals,
        rawJson: JSON.stringify(normalized.rawJson),
        importId: importRun.id,
        competitionId: competition.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      },
    });

    await prisma.historicalTeamMatch.createMany({
      data: [
        {
          historicalMatchId: historicalMatch.id,
          teamId: homeTeam.id,
          opponentTeamId: awayTeam.id,
          isHome: true,
          goalsFor: homeGoals,
          goalsAgainst: awayGoals,
          points: points(homeGoals, awayGoals),
          kickoff: kickoffDate(normalized.kickoffDate),
        },
        {
          historicalMatchId: historicalMatch.id,
          teamId: awayTeam.id,
          opponentTeamId: homeTeam.id,
          isHome: false,
          goalsFor: awayGoals,
          goalsAgainst: homeGoals,
          points: points(awayGoals, homeGoals),
          kickoff: kickoffDate(normalized.kickoffDate),
        },
      ],
      skipDuplicates: true,
    });
    importedMatches += 1;
  }

  console.log(
    JSON.stringify({
      ok: true,
      imported: true,
      sourceFile,
      sourceRepo,
      sourceCommit,
      sourcePath,
      importedMatches,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
