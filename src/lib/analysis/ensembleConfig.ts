import type {
  AnalysisModelConfigInput,
  EnsembleWeights,
} from "@/types/domain";

export interface ResolvedLogisticConfig {
  coefficients: [number, number, number, number];
  intercept: number;
  drawBase: number;
  drawSensitivity: number;
  drawMin: number;
  drawMax: number;
}

export interface ResolvedAnalysisModelConfig {
  label?: string;
  weights: EnsembleWeights;
  logistic: ResolvedLogisticConfig;
}

export const DEFAULT_ANALYSIS_MODEL_CONFIG: ResolvedAnalysisModelConfig = {
  weights: {
    dixonColes: 0.6,
    simulation: 0.2,
    logistic: 0.2,
  },
  logistic: {
    coefficients: [1.35, 0.62, 0.48, 0.4],
    intercept: -0.08,
    drawBase: 0.33,
    drawSensitivity: 0.18,
    drawMin: 0.16,
    drawMax: 0.33,
  },
};

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveWeights(
  weights: AnalysisModelConfigInput["weights"],
): EnsembleWeights {
  const raw = {
    dixonColes: Math.max(
      0,
      finiteOr(weights?.dixonColes, DEFAULT_ANALYSIS_MODEL_CONFIG.weights.dixonColes),
    ),
    simulation: Math.max(
      0,
      finiteOr(weights?.simulation, DEFAULT_ANALYSIS_MODEL_CONFIG.weights.simulation),
    ),
    logistic: Math.max(
      0,
      finiteOr(weights?.logistic, DEFAULT_ANALYSIS_MODEL_CONFIG.weights.logistic),
    ),
  };
  const total = raw.dixonColes + raw.simulation + raw.logistic;
  if (total <= 0) return DEFAULT_ANALYSIS_MODEL_CONFIG.weights;

  return {
    dixonColes: raw.dixonColes / total,
    simulation: raw.simulation / total,
    logistic: raw.logistic / total,
  };
}

export function resolveAnalysisModelConfig(
  override?: AnalysisModelConfigInput,
): ResolvedAnalysisModelConfig {
  const logistic = override?.logistic;
  return {
    label: override?.label,
    weights: resolveWeights(override?.weights),
    logistic: {
      coefficients:
        logistic?.coefficients ??
        DEFAULT_ANALYSIS_MODEL_CONFIG.logistic.coefficients,
      intercept: finiteOr(
        logistic?.intercept,
        DEFAULT_ANALYSIS_MODEL_CONFIG.logistic.intercept,
      ),
      drawBase: finiteOr(
        logistic?.drawBase,
        DEFAULT_ANALYSIS_MODEL_CONFIG.logistic.drawBase,
      ),
      drawSensitivity: finiteOr(
        logistic?.drawSensitivity,
        DEFAULT_ANALYSIS_MODEL_CONFIG.logistic.drawSensitivity,
      ),
      drawMin: finiteOr(
        logistic?.drawMin,
        DEFAULT_ANALYSIS_MODEL_CONFIG.logistic.drawMin,
      ),
      drawMax: finiteOr(
        logistic?.drawMax,
        DEFAULT_ANALYSIS_MODEL_CONFIG.logistic.drawMax,
      ),
    },
  };
}
