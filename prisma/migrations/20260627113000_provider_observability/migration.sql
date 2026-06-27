-- CreateTable
CREATE TABLE "ProviderTelemetry" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "errorCode" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderTelemetry_provider_occurredAt_idx" ON "ProviderTelemetry"("provider", "occurredAt");

-- CreateIndex
CREATE INDEX "ProviderTelemetry_operation_occurredAt_idx" ON "ProviderTelemetry"("operation", "occurredAt");
