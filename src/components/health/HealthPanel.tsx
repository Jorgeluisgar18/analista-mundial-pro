"use client";

import { useCallback, useEffect, useState } from "react";

interface ProviderUsage {
  provider: string;
  used: number;
  limit: number;
  period: string;
  periodKey: string;
  resetsAt: string;
  updatedAt: string;
}

interface ProviderInfo {
  id: string;
  label: string;
  configured: boolean;
  purpose: string;
  usage: ProviderUsage | null;
}

interface HealthData {
  mode: "demo" | "api-ready";
  checkedAt: string;
  providers: ProviderInfo[];
  database: "connected" | "no-data";
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const level = pct > 80 ? "high" : pct > 50 ? "mid" : "low";
  return (
    <span className={`health-usage-bar level-${level}`}>
      <span className="health-usage-fill" style={{ width: `${pct}%` }} />
      <span className="health-usage-label">{used}/{limit}</span>
    </span>
  );
}

function ProviderCard({ provider }: { provider: ProviderInfo }) {
  return (
    <article className={`health-provider ${provider.configured ? "on" : "off"}`}>
      <header>
        <span className={`health-dot ${provider.configured ? "dot-on" : "dot-off"}`} />
        <strong>{provider.label}</strong>
        <code className="health-badge">{provider.id}</code>
      </header>
      <p className="health-purpose">{provider.purpose}</p>
      {provider.usage ? (
        <div className="health-usage-row">
          <span className="health-label">Uso ({provider.usage.period})</span>
          <UsageBar used={provider.usage.used} limit={provider.usage.limit} />
          <span className="health-resets">
            Reinicia: {new Date(provider.usage.resetsAt).toLocaleDateString()}
          </span>
        </div>
      ) : (
        provider.configured && <em className="health-no-usage">Sin registros de uso aún</em>
      )}
    </article>
  );
}

export function HealthPanel() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setHealth(await res.json());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al cargar estado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  return (
    <section className="health-panel" id="salud">
      <h2 className="health-heading">
        Estado del sistema
        <span className={`health-mode mode-${health?.mode ?? "loading"}`}>
          {health?.mode === "api-ready" ? "API activa" : health?.mode === "demo" ? "Modo demo" : "Cargando..."}
        </span>
      </h2>

      {err && <div className="health-error">{err}</div>}

      {health && (
        <>
          <div className="health-meta">
            <span>BD: <strong>{health.database === "connected" ? "Conectada" : "Sin datos"}</strong></span>
            <span>Verificado: {new Date(health.checkedAt).toLocaleTimeString()}</span>
            <button type="button" className="health-refresh" onClick={fetchHealth} aria-label="Actualizar estado del sistema">↻</button>
            {loading && <span className="health-loading" aria-label="Cargando estado del sistema">Cargando...</span>}
          </div>
          <div className="health-grid">
            {health.providers.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
