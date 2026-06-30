import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { getDemoDatasetById } from "@/data/demo";
import { applyManualOverrides } from "@/lib/overrides/applyManualOverrides";
import type { ManualOverrideInput, ManualOverrideRecord } from "@/types/domain";

interface DemoManualOverride extends ManualOverrideRecord {
  createdAt: string;
}

function demoOverrideId() {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `demo-manual-${randomId ?? Date.now()}`;
}

function buildDemoOverride(input: ManualOverrideInput): DemoManualOverride {
  const now = new Date().toISOString();
  return {
    id: demoOverrideId(),
    type: input.type,
    description: input.description,
    sourceUrl: input.sourceUrl || undefined,
    observedAt: input.observedAt ?? now,
    teamId: input.teamId,
    player: input.player,
    impact: input.impact,
    area: input.area,
    value: input.value,
    createdAt: now,
  };
}

export function applyDemoManualOverride(
  matchId: string,
  input: ManualOverrideInput,
) {
  const dataset = getDemoDatasetById(matchId);
  if (!dataset) return null;

  const override = buildDemoOverride(input);
  const adjustedDataset = applyManualOverrides(dataset, [override]);
  return {
    override,
    analysisUpdated: true,
    analysis: analyzeMatch(adjustedDataset, { manuallyUpdated: true }),
  };
}
