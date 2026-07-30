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

interface ProviderTelemetry {
  provider: string;
  total: number;
  failures: number;
  averageLatencyMs: number;
  lastObservedAt: string | null;
}

interface ProviderInfo {
  id: string;
  label: string;
  configured: boolean;
  purpose: string;
  usage: ProviderUsage | null;
  telemetry: ProviderTelemetry | null;
}

type ModelHealthStatus =
  | "ready"
  | "partial"
  | "stale"
  | "missing"
  | "unavailable";

interface ModelHealth {
  status: "connected" | "unavailable";
  checkedAt: string;
  elo: {
    status: ModelHealthStatus;
    totalRows: number;
    rowsWithOpponentElo: number;
    coverage: number;
  };
  backtesting: {
    status: ModelHealthStatus;
    latestRunAt: string | null;
    daysSinceLastRun: number | null;
    sampleSize: number;
    brier: number | null;
    logLoss: number | null;
    rps: number | null;
    dixonColesRho: number | null;
    rhoSampleSize: number | null;
    source: string | null;
    modelConfig: {
      label?: string;
      weights?: {
        dixonColes?: number;
        simulation?: number;
        logistic?: number;
      };
    } | null;
  };
  error?: string;
}

interface HealthData {
  mode: "demo" | "api-ready" | "development-demo" | "operational" | "degraded";
  checkedAt: string;
  providers: ProviderInfo[];
  database: "connected" | "unavailable";
  telemetry?: ProviderTelemetry[];
  telemetryStatus?: "connected" | "unavailable";
  databaseError?: string | null;
  modelHealth?: ModelHealth;
}

const healthLoadError = "No se pudo cargar el estado del sistema.";

function isHealthData(value: unknown): value is HealthData {
  if (!value || typeof value !== "object") return false;

  const data = value as Partial<HealthData>;
  return (
    (data.mode === "demo" ||
      data.mode === "api-ready" ||
      data.mode === "development-demo" ||
      data.mode === "operational" ||
      data.mode === "degraded") &&
    typeof data.checkedAt === "string" &&
    Array.isArray(data.providers) &&
    (data.database === "connected" || data.database === "unavailable")
  );
}

async function loadHealth(): Promise<HealthData> {
  const res = await fetch("/api/health");
  let data: unknown;

  try {
    data = await res.json();
  } catch {
    throw new Error(healthLoadError);
  }

  if (!isHealthData(data) || (!res.ok && data.mode !== "degraded")) {
    throw new Error(healthLoadError);
  }

  return data;
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
  const statusLabel = provider.configured
    ? provider.telemetry?.failures
      ? "Configurado con fallos recientes"
      : "Configurado"
    : "No configurado";

  return (
    <article className={`health-provider ${provider.configured ? "on" : "off"}`}>
      <header>
        <span className={`health-dot ${provider.configured ? "dot-on" : "dot-off"}`} />
        <strong>{provider.label}</strong>
        <code className="health-badge">{provider.id}</code>
      </header>
      <p className="health-purpose">
        Estado: <strong>{statusLabel}</strong>
      </p>
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
      {provider.telemetry ? (
        <div className="health-usage-row">
          <span className="health-label">Fiabilidad 24h</span>
          <span className="health-usage-label">
            {provider.telemetry.failures}/{provider.telemetry.total} fallos
          </span>
          <span className="health-resets">
            Latencia media: {provider.telemetry.averageLatencyMs} ms
          </span>
        </div>
      ) : (
        provider.configured && (
          <em className="health-no-usage">Sin telemetría reciente</em>
        )
      )}
    </article>
  );
}

const modelStatusLabel: Record<ModelHealthStatus, string> = {
  ready: "Actualizado",
  partial: "Parcial",
  stale: "Desactualizado",
  missing: "Sin datos",
  unavailable: "No disponible",
};

function daysSinceLabel(days: number) {
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

function weightPct(value?: number) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function OperationalSummary({ health }: { health: HealthData }) {
  const configuredProviders = health.providers.filter(
    (provider) => provider.configured,
  ).length;
  const dailyUsage = health.providers
    .map((provider) => provider.usage)
    .filter(
      (usage): usage is ProviderUsage =>
        usage !== null && usage.period === "day",
    )
    .reduce(
      (total, usage) => ({
        used: total.used + usage.used,
        limit: total.limit + usage.limit,
      }),
      { used: 0, limit: 0 },
    );
  const telemetryLabel =
    health.telemetryStatus === "connected"
      ? "Telemetría conectada"
      : "Telemetría no disponible";
  const databaseLabel =
    health.database === "connected" ? "Persistencia activa" : "Sin persistencia";

  return (
    <div className="health-operational-summary" aria-label="Resumen operativo">
      <article>
        <span>Resumen operativo</span>
        <strong>
          Proveedores activos: {configuredProviders}/{health.providers.length}
        </strong>
        <small>{databaseLabel}</small>
      </article>
      <article>
        <span>Cuota y cache</span>
        <strong>
          Cuota diaria usada:{" "}
          {dailyUsage.limit > 0
            ? `${dailyUsage.used}/${dailyUsage.limit}`
            : "sin uso diario"}
        </strong>
        <small>Cache inteligente protege llamadas repetidas y cuotas gratis.</small>
      </article>
      <article>
        <span>Telemetría</span>
        <strong>{telemetryLabel}</strong>
        <small>Fallos, latencia y uso quedan auditables cuando hay BD.</small>
      </article>
    </div>
  );
}

function ModelHealthCard({ modelHealth }: { modelHealth: ModelHealth }) {
  const modelConfig = modelHealth.backtesting.modelConfig;

  return (
    <article
      className={`health-provider health-model-card ${modelHealth.status === "connected" ? "on" : "off"}`}
    >
      <header>
        <span
          className={`health-dot ${modelHealth.status === "connected" ? "dot-on" : "dot-off"}`}
        />
        <strong>Modelo histórico</strong>
        <code className="health-badge">Elo + backtesting</code>
      </header>
      <p className="health-purpose">
        Elo: <strong>{modelStatusLabel[modelHealth.elo.status]}</strong> ·{" "}
        {modelHealth.elo.coverage}% de cobertura ({modelHealth.elo.rowsWithOpponentElo}/
        {modelHealth.elo.totalRows})
      </p>
      <p className="health-purpose">
        Backtesting:{" "}
        <strong>{modelStatusLabel[modelHealth.backtesting.status]}</strong> ·{" "}
        {modelHealth.backtesting.sampleSize} partidos
        {modelHealth.backtesting.daysSinceLastRun !== null
          ? ` · ${daysSinceLabel(modelHealth.backtesting.daysSinceLastRun)}`
          : ""}
      </p>
      <div className="health-usage-row">
        <span className="health-label">Dixon-Coles rho</span>
        <span className="health-usage-label">
          {modelHealth.backtesting.dixonColesRho !== null
            ? modelHealth.backtesting.dixonColesRho.toFixed(3)
            : "Sin calibrar"}
        </span>
        <span className="health-resets">
          {modelHealth.backtesting.rhoSampleSize
            ? `${modelHealth.backtesting.rhoSampleSize} marcadores`
            : modelHealth.backtesting.source ?? "Sin fuente guardada"}
        </span>
      </div>
      {modelConfig ? (
        <div className="health-usage-row health-calibration">
          <span className="health-label">Pesos calibrados</span>
          <div className="health-model-note">
            <strong>Modelo listo para análisis</strong>
            <span>Último backtest persistido: {modelConfig.label ?? "config guardada"}</span>
          </div>
          <div className="health-weight-grid" aria-label="Pesos calibrados del modelo">
            <span className="health-weight-pill">
              <small>Dixon-Coles</small>
              <strong>DC {weightPct(modelConfig.weights?.dixonColes)}</strong>
            </span>
            <span className="health-weight-pill">
              <small>Monte Carlo</small>
              <strong>MC {weightPct(modelConfig.weights?.simulation)}</strong>
            </span>
            <span className="health-weight-pill">
              <small>Logística</small>
              <strong>LOG {weightPct(modelConfig.weights?.logistic)}</strong>
            </span>
          </div>
        </div>
      ) : null}
      {modelHealth.error && (
        <em className="health-no-usage">Detalle: {modelHealth.error}</em>
      )}
    </article>
  );
}

export function HealthPanel() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInitialHealth() {
      try {
        const data = await loadHealth();
        if (!cancelled) setHealth(data);
      } catch (e: unknown) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Error al cargar estado");
        }
      }
    }

    void loadInitialHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      setHealth(await loadHealth());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al cargar estado");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="health-panel" id="salud">
      <h2 className="health-heading">
        Estado del sistema
        <span className={`health-mode mode-${health?.mode ?? "loading"}`}>
          {health?.mode === "api-ready" || health?.mode === "operational"
            ? "Datos reales listos"
            : health?.mode === "demo" || health?.mode === "development-demo"
              ? "Respaldo local"
              : health?.mode === "degraded"
                ? "Servicio degradado"
                : "Cargando..."}
        </span>
      </h2>

      {err && <div className="health-error">{err}</div>}

      {health && (
        <>
          <div className="health-meta">
            <span>
              BD:{" "}
              <strong>
                {health.database === "connected"
                  ? "Neon/Postgres conectada"
                  : "Sin persistencia"}
              </strong>
            </span>
            {health.databaseError && (
              <span title={health.databaseError}>
                Motivo BD: {health.databaseError}
              </span>
            )}
            <span>Verificado: {new Date(health.checkedAt).toLocaleTimeString()}</span>
            <button
              type="button"
              className="health-refresh"
              onClick={fetchHealth}
              aria-label="Actualizar estado del sistema"
            >
              ↻
            </button>
            {loading && (
              <span className="health-loading" aria-label="Cargando estado del sistema">
                Cargando...
              </span>
            )}
          </div>
          {health.modelHealth && (
            <div className="health-grid">
              <ModelHealthCard modelHealth={health.modelHealth} />
            </div>
          )}
          <OperationalSummary health={health} />
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
