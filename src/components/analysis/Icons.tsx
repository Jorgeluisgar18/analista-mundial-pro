"use client";

import React from "react";

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={open ? "open" : ""}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6v5h-5M4 18v-5h5M6.1 8A7 7 0 0 1 18.7 6M17.9 16A7 7 0 0 1 5.3 18" />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 20 4.2-1 10-10-3.2-3.2-10 10L4 20ZM13.8 7 17 10.2" />
    </svg>
  );
}

export function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m0-12 4 4m-4-4L8 7M5 13v7h14v-7" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5m0 3h.01" />
    </svg>
  );
}

export function TrendUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 16 5-5 4 4 7-8M15 7h5v5" />
    </svg>
  );
}

export function TrendDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 8 5 5 4-4 7 8M15 17h5v-5" />
    </svg>
  );
}

export function GoalkeeperIcon() {
  return (
    <svg className="keeper-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 51V13h44v38M15 19h34M32 19v32M15 51c4-12 10-18 17-18s13 6 17 18" />
    </svg>
  );
}
