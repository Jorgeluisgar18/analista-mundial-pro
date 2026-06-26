"use client";

import React from "react";

export function ConfidenceBadge({ value }: { value: number }) {
  return (
    <div className="confidence-badge" title="Combinación de cobertura de datos (25%), frescura (20%), acuerdo entre fuentes (20%), estabilidad del modelo (20%) y calibración histórica (15%). Alineaciones no confirmadas limitan el máximo a 6/10.">
      <span>Confianza del modelo</span>
      <strong>{value.toFixed(1)}</strong>
      <small>/10</small>
    </div>
  );
}
