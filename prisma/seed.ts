import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl || databaseUrl.startsWith("file:")) {
  throw new Error(
    "DATABASE_URL debe apuntar a Neon/Postgres para ejecutar prisma db seed.",
  );
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

async function main() {
  const competition = await prisma.competition.upsert({
    where: { externalId: "wc-2026" },
    update: {},
    create: {
      externalId: "wc-2026",
      name: "FIFA World Cup",
      kind: "NATIONAL",
    },
  });
  const homeTeam = await prisma.team.upsert({
    where: { externalId: "col" },
    update: {},
    create: {
      externalId: "col",
      name: "Colombia",
      code: "COL",
      kind: "NATIONAL",
    },
  });
  const awayTeam = await prisma.team.upsert({
    where: { externalId: "bra" },
    update: {},
    create: {
      externalId: "bra",
      name: "Brasil",
      code: "BRA",
      kind: "NATIONAL",
    },
  });
  await prisma.match.upsert({
    where: { externalId: "demo-col-bra" },
    update: {},
    create: {
      externalId: "demo-col-bra",
      kickoff: new Date("2026-06-15T22:00:00Z"),
      status: "preliminary",
      stage: "Grupo D",
      venue: "MetLife Stadium",
      city: "East Rutherford",
      country: "Estados Unidos",
      timezone: "America/New_York",
      dataOrigin: "DEMO",
      competitionId: competition.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
    },
  });
  await prisma.modelVersion.upsert({
    where: {
      name_version: {
        name: "AMP ensemble",
        version: "1.0.0",
      },
    },
    update: {},
    create: {
      name: "AMP ensemble",
      version: "1.0.0",
      config: JSON.stringify({
        recentForm: 0.2,
        currentCompetition: 0.2,
        attack: 0.15,
        defence: 0.15,
        availability: 0.1,
        context: 0.1,
        tactics: 0.05,
        referee: 0.03,
        weather: 0.02,
      }),
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
