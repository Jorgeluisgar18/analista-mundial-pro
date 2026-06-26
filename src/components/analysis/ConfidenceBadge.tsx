"use client";

import React from "react";

export function ConfidenceBadge({ value }: { value: number }) {
  return (
    <div className="confidence-badge">
      <span>Confianza del modelo</span>
      <strong>{value.toFixed(1)}</strong>
      <small>/10</small>
    </div>
  );
}
