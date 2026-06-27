-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "kind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "kickoff" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "stage" TEXT,
    "venue" TEXT,
    "city" TEXT,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "dataOrigin" TEXT NOT NULL DEFAULT 'DEMO',
    "competitionId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "observedAt" DATETIME NOT NULL,
    "note" TEXT,
    CONSTRAINT "EvidenceRecord_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MatchSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OddsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "odd" REAL NOT NULL,
    "observedAt" DATETIME NOT NULL,
    CONSTRAINT "OddsSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "metrics" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "manuallyUpdated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisRun_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalysisRun_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MatchSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalysisRun_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisRunId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "line" TEXT,
    "probability" REAL,
    "confidence" REAL NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "minimumOdd" REAL,
    "availableOdd" REAL,
    "expectedValue" REAL,
    "evidenceStatus" TEXT NOT NULL,
    CONSTRAINT "Prediction_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManualOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "observedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManualOverride_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL,
    "resetsAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Competition_externalId_key" ON "Competition"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_externalId_key" ON "Team"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");

-- CreateIndex
CREATE INDEX "Match_kickoff_idx" ON "Match"("kickoff");

-- CreateIndex
CREATE INDEX "Match_competitionId_kickoff_idx" ON "Match"("competitionId", "kickoff");

-- CreateIndex
CREATE INDEX "MatchSnapshot_matchId_fetchedAt_idx" ON "MatchSnapshot"("matchId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSnapshot_matchId_hash_key" ON "MatchSnapshot"("matchId", "hash");

-- CreateIndex
CREATE INDEX "EvidenceRecord_snapshotId_field_idx" ON "EvidenceRecord"("snapshotId", "field");

-- CreateIndex
CREATE INDEX "OddsSnapshot_matchId_market_observedAt_idx" ON "OddsSnapshot"("matchId", "market", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModelVersion_name_version_key" ON "ModelVersion"("name", "version");

-- CreateIndex
CREATE INDEX "AnalysisRun_matchId_createdAt_idx" ON "AnalysisRun"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_inputHash_idx" ON "AnalysisRun"("inputHash");

-- CreateIndex
CREATE INDEX "Prediction_analysisRunId_category_idx" ON "Prediction"("analysisRunId", "category");

-- CreateIndex
CREATE INDEX "ManualOverride_matchId_createdAt_idx" ON "ManualOverride"("matchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsage_provider_periodKey_key" ON "ApiUsage"("provider", "periodKey");
