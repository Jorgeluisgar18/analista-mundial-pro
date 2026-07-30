import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDataset } from "@/data/demo";
import { createMatchSnapshotCache } from "@/lib/cache/matchSnapshotCache";
import { prisma } from "@/lib/db/prisma";
import { describeWithDatabase } from "../helpers/database";

vi.mock("server-only", () => ({}));

const ids = {
  competition: "competition-cache-test",
  homeTeam: "home-cache-test",
  awayTeam: "away-cache-test",
  match: "match-cache-test",
};

async function createCachedSnapshot({
  fetchedAt,
  kickoff = "2026-07-10T20:00:00.000Z",
}: {
  fetchedAt: string;
  kickoff?: string;
}) {
  const competition = await prisma.competition.create({
    data: {
      externalId: ids.competition,
      name: "Competición cache",
      kind: "NATIONAL",
    },
  });
  const homeTeam = await prisma.team.create({
    data: {
      externalId: ids.homeTeam,
      name: "Local cache",
      code: "LOC",
      kind: "NATIONAL",
    },
  });
  const awayTeam = await prisma.team.create({
    data: {
      externalId: ids.awayTeam,
      name: "Visitante cache",
      code: "VIS",
      kind: "NATIONAL",
    },
  });
  const match = await prisma.match.create({
    data: {
      externalId: ids.match,
      kickoff: new Date(kickoff),
      status: "preliminary",
      stage: "Cache",
      venue: "Cache Stadium",
      city: "Cache City",
      country: "Cache Country",
      timezone: "UTC",
      dataOrigin: "API",
      competitionId: competition.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
    },
  });
  const dataset = structuredClone(demoDataset);
  dataset.match = {
    ...dataset.match,
    id: ids.match,
    kickoff,
    dataOrigin: "API",
    fetchedAt,
    competition: {
      ...dataset.match.competition,
      id: ids.competition,
      name: "Competición cache",
    },
    homeTeam: {
      ...dataset.match.homeTeam,
      id: ids.homeTeam,
      name: "Local cache",
    },
    awayTeam: {
      ...dataset.match.awayTeam,
      id: ids.awayTeam,
      name: "Visitante cache",
    },
  };
  dataset.lineups = dataset.lineups.map((lineup) => ({
    ...lineup,
    confirmed: true,
  }));

  await prisma.matchSnapshot.create({
    data: {
      matchId: match.id,
      hash: `cache-${fetchedAt}`,
      payload: JSON.stringify(dataset),
      fetchedAt: new Date(fetchedAt),
      source: "API",
    },
  });
}

afterEach(async () => {
  await prisma.match.deleteMany({ where: { externalId: ids.match } });
  await prisma.team.deleteMany({
    where: { externalId: { in: [ids.homeTeam, ids.awayTeam] } },
  });
  await prisma.competition.deleteMany({
    where: { externalId: ids.competition },
  });
});

describeWithDatabase("matchSnapshotCache", () => {
  it("devuelve un snapshot persistido cuando sigue fresco", async () => {
    await createCachedSnapshot({
      fetchedAt: "2026-07-10T18:45:00.000Z",
    });
    const cache = createMatchSnapshotCache({
      now: () => new Date("2026-07-10T18:55:00.000Z"),
    });

    const result = await cache.getFreshDataset(ids.match);

    expect(result?.match.id).toBe(ids.match);
    expect(result?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "match-snapshot-cache-hit" }),
      ]),
    );
  });

  it("ignora un snapshot persistido vencido", async () => {
    await createCachedSnapshot({
      fetchedAt: "2026-07-10T17:00:00.000Z",
    });
    const cache = createMatchSnapshotCache({
      now: () => new Date("2026-07-10T18:55:00.000Z"),
    });

    await expect(cache.getFreshDataset(ids.match)).resolves.toBeNull();
  });

});

describe("matchSnapshotCache sin base de datos", () => {
  it("degrada una falla al consultar snapshots a cache miss", async () => {
    const cache = createMatchSnapshotCache({
      database: {
        match: {
          findUnique: async () => {
            throw new Error("Postgres temporalmente no disponible");
          },
        },
      },
    });

    await expect(cache.getFreshDataset(ids.match)).resolves.toBeNull();
  });
});
