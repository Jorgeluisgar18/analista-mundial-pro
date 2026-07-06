-- Historical engine and calibration foundation.
-- This migration intentionally adds new tables only; previous Netlify/Neon
-- baseline migrations remain immutable.

CREATE TABLE IF NOT EXISTS "HistoricalImport" (
    "id" TEXT NOT NULL,
    "sourceRepo" TEXT NOT NULL,
    "sourceCommit" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileCount" INTEGER NOT NULL DEFAULT 1,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "rawMeta" TEXT,

    CONSTRAINT "HistoricalImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HistoricalMatch" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceRepo" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "sourceIndex" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "round" TEXT,
    "group" TEXT,
    "kickoff" TIMESTAMP(3),
    "kickoffDate" TEXT NOT NULL,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "rawJson" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HistoricalTeamMatch" (
    "id" TEXT NOT NULL,
    "historicalMatchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "opponentTeamId" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "opponentElo" DOUBLE PRECISION,
    "kickoff" TIMESTAMP(3),

    CONSTRAINT "HistoricalTeamMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CalibrationRun" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "brier" DOUBLE PRECISION NOT NULL,
    "logLoss" DOUBLE PRECISION NOT NULL,
    "rps" DOUBLE PRECISION NOT NULL,
    "empiricalHome" DOUBLE PRECISION NOT NULL,
    "empiricalDraw" DOUBLE PRECISION NOT NULL,
    "empiricalAway" DOUBLE PRECISION NOT NULL,
    "config" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalibrationRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HistoricalImport_sourceRepo_sourceCommit_sourcePath_key" ON "HistoricalImport"("sourceRepo", "sourceCommit", "sourcePath");
CREATE INDEX IF NOT EXISTS "HistoricalImport_sourceRepo_importedAt_idx" ON "HistoricalImport"("sourceRepo", "importedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "HistoricalMatch_externalId_key" ON "HistoricalMatch"("externalId");
CREATE INDEX IF NOT EXISTS "HistoricalMatch_competitionId_kickoff_idx" ON "HistoricalMatch"("competitionId", "kickoff");
CREATE INDEX IF NOT EXISTS "HistoricalMatch_homeTeamId_kickoff_idx" ON "HistoricalMatch"("homeTeamId", "kickoff");
CREATE INDEX IF NOT EXISTS "HistoricalMatch_awayTeamId_kickoff_idx" ON "HistoricalMatch"("awayTeamId", "kickoff");
CREATE INDEX IF NOT EXISTS "HistoricalMatch_sourceRepo_sourcePath_idx" ON "HistoricalMatch"("sourceRepo", "sourcePath");
CREATE UNIQUE INDEX IF NOT EXISTS "HistoricalTeamMatch_historicalMatchId_teamId_key" ON "HistoricalTeamMatch"("historicalMatchId", "teamId");
CREATE INDEX IF NOT EXISTS "HistoricalTeamMatch_teamId_kickoff_idx" ON "HistoricalTeamMatch"("teamId", "kickoff");
CREATE INDEX IF NOT EXISTS "HistoricalTeamMatch_opponentTeamId_kickoff_idx" ON "HistoricalTeamMatch"("opponentTeamId", "kickoff");
CREATE INDEX IF NOT EXISTS "CalibrationRun_modelName_modelVersion_createdAt_idx" ON "CalibrationRun"("modelName", "modelVersion", "createdAt");

ALTER TABLE "HistoricalMatch" ADD CONSTRAINT "HistoricalMatch_importId_fkey" FOREIGN KEY ("importId") REFERENCES "HistoricalImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistoricalMatch" ADD CONSTRAINT "HistoricalMatch_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistoricalMatch" ADD CONSTRAINT "HistoricalMatch_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistoricalMatch" ADD CONSTRAINT "HistoricalMatch_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistoricalTeamMatch" ADD CONSTRAINT "HistoricalTeamMatch_historicalMatchId_fkey" FOREIGN KEY ("historicalMatchId") REFERENCES "HistoricalMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistoricalTeamMatch" ADD CONSTRAINT "HistoricalTeamMatch_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
