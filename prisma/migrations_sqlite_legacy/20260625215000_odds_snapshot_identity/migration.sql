-- CreateIndex
CREATE UNIQUE INDEX "OddsSnapshot_matchId_bookmaker_market_outcome_observedAt_key"
ON "OddsSnapshot"("matchId", "bookmaker", "market", "outcome", "observedAt");
