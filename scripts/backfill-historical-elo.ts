import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  opponentEloUpdates,
  type OpponentEloUpdate,
  type HistoricalEloMatch,
} from "@/lib/historical/elo";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
const prisma = databaseUrl
  ? new PrismaClient({ adapter: new PrismaPg(databaseUrl) })
  : undefined;
const BATCH_SIZE = 500;

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function applyOpponentEloUpdates(updates: OpponentEloUpdate[]) {
  if (!prisma) return 0;
  let updatedRows = 0;
  for (const batch of chunk(updates, BATCH_SIZE)) {
    const values: unknown[] = [];
    const placeholders = batch
      .map((update, index) => {
        const offset = index * 3;
        values.push(update.historicalMatchId, update.teamId, update.opponentElo);
        return `($${offset + 1}::text, $${offset + 2}::text, $${offset + 3}::double precision)`;
      })
      .join(", ");
    updatedRows += await prisma.$executeRawUnsafe(
      `
        UPDATE "HistoricalTeamMatch" AS h
        SET "opponentElo" = v."opponentElo"
        FROM (VALUES ${placeholders}) AS v("historicalMatchId", "teamId", "opponentElo")
        WHERE h."historicalMatchId" = v."historicalMatchId"
          AND h."teamId" = v."teamId"
      `,
      ...values,
    );
  }
  return updatedRows;
}

async function main() {
  if (!prisma) {
    throw new Error(
      "DATABASE_URL no está configurada. Define Neon/Postgres antes de recalcular Elo histórico.",
    );
  }

  const matches = await prisma.historicalMatch.findMany({
    where: {
      homeGoals: { not: null },
      awayGoals: { not: null },
    },
    orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    select: {
      id: true,
      kickoff: true,
      homeTeamId: true,
      awayTeamId: true,
      homeGoals: true,
      awayGoals: true,
    },
  });
  const eloMatches = matches.flatMap<HistoricalEloMatch>((match) => {
    if (match.homeGoals === null || match.awayGoals === null) return [];
    return [
      {
        id: match.id,
        kickoff: match.kickoff,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
      },
    ];
  });
  const updates = opponentEloUpdates(eloMatches);

  const updatedRows = await applyOpponentEloUpdates(updates);

  console.log(
    JSON.stringify({
      ok: true,
      matches: eloMatches.length,
      updates: updates.length,
      updatedRows,
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
