-- Provider telemetry support for Netlify Database.
-- This is intentionally idempotent because production may apply schema
-- through Netlify DB migrations or Prisma migrations depending on the
-- connected database workflow.

CREATE TABLE IF NOT EXISTS "ProviderTelemetry" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "errorCode" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTelemetry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProviderTelemetry_provider_occurredAt_idx" ON "ProviderTelemetry"("provider", "occurredAt");

CREATE INDEX IF NOT EXISTS "ProviderTelemetry_operation_occurredAt_idx" ON "ProviderTelemetry"("operation", "occurredAt");
