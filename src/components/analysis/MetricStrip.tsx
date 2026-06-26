"use client";

import React from "react";

export function MetricStrip({
  items,
}: {
  items: Array<[string, string | number, string?]>;
}) {
  return (
    <div className="metric-strip">
      {items.map(([label, value, suffix]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>
            {typeof value === "number" ? value.toFixed(value % 1 ? 1 : 0) : value}
            {suffix}
          </strong>
        </div>
      ))}
    </div>
  );
}
