-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSnapshot" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceRecord" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "EvidenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OddsSnapshot" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "odd" DOUBLE PRECISION NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OddsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "metrics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "manuallyUpdated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "line" TEXT,
    "probability" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "minimumOdd" DOUBLE PRECISION,
    "availableOdd" DOUBLE PRECISION,
    "expectedValue" DOUBLE PRECISION,
    "marketProbability" DOUBLE PRECISION,
    "modelEdge" DOUBLE PRECISION,
    "evidenceStatus" TEXT NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualOverride" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "teamId" TEXT,
    "player" TEXT,
    "impact" TEXT,
    "area" TEXT,
    "value" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'day',
    "periodKey" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL,
    "resetsAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "OddsSnapshot_matchId_bookmaker_market_outcome_observedAt_key" ON "OddsSnapshot"("matchId", "bookmaker", "market", "outcome", "observedAt");

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

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSnapshot" ADD CONSTRAINT "MatchSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MatchSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MatchSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualOverride" ADD CONSTRAINT "ManualOverride_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
