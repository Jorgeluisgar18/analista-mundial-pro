CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetsAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitBucket_scope_clientKey_key" ON "RateLimitBucket"("scope", "clientKey");
CREATE INDEX "RateLimitBucket_resetsAt_idx" ON "RateLimitBucket"("resetsAt");
