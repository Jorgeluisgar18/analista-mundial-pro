import type { Prediction } from "@/types/domain";

export const evidenceLabels = {
  confirmed: "Confirmado",
  expected: "Estimado",
  inferred: "Inferido",
  conflict: "Conflicto",
  unavailable: "No disponible",
} satisfies Record<Prediction["evidenceStatus"], string>;

export const evidenceDescriptions = {
  confirmed: "Dato observado o confirmado por fuente conectada.",
  expected: "Dato estimado con priors o información previa.",
  inferred: "Dato inferido por el motor con evidencia indirecta.",
  conflict: "Fuentes con señales contradictorias.",
  unavailable: "Sin datos suficientes para sostener el mercado.",
} satisfies Record<Prediction["evidenceStatus"], string>;

function formatSigned(value: number, suffix = "") {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

export function predictionEvidenceSummary(prediction: Prediction) {
  const sourceCount = prediction.sourceIds.length;
  const sourceLabel =
    sourceCount === 1 ? "1 fuente" : `${sourceCount} fuentes`;
  const parts = [sourceLabel];

  if (prediction.availableOdd !== undefined) {
    parts.push(`cuota disponible ${prediction.availableOdd.toFixed(2)}`);
  } else {
    parts.push("sin cuota disponible");
  }

  if (prediction.modelEdge !== undefined) {
    parts.push(`ventaja del modelo ${formatSigned(prediction.modelEdge, " pp")}`);
  } else if (prediction.marketProbability !== undefined) {
    parts.push(`mercado implícito ${prediction.marketProbability.toFixed(1)}%`);
  } else {
    parts.push("sin referencia de mercado");
  }

  if (prediction.interval) {
    parts.push(
      `rango ${prediction.interval[0].toFixed(0)}-${prediction.interval[1].toFixed(0)}%`,
    );
  }

  return parts.join(" · ");
}

export function predictionEvidenceTone(prediction: Prediction) {
  if (prediction.evidenceStatus === "unavailable") {
    return "No debe usarse para decisión: falta dato base o titularidad mínima.";
  }
  if (prediction.evidenceStatus === "conflict") {
    return "Lectura sensible: hay señales contradictorias entre fuentes.";
  }
  if (prediction.modelEdge !== undefined && prediction.modelEdge > 3) {
    return "El modelo supera al mercado: revisar cuota, límites y frescura antes de actuar.";
  }
  if (prediction.expectedValue !== undefined && prediction.expectedValue > 0) {
    return "Valor teórico positivo, condicionado a que la cuota siga disponible.";
  }
  if (prediction.confidence < 5) {
    return "Usar como observación: confianza limitada por datos preliminares.";
  }
  return "Lectura estable para monitoreo, no garantía de resultado.";
}
