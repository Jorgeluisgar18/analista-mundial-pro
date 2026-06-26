import type { SourceRecord } from "@/types/domain";
import { formatTimestamp } from "@/lib/format/date";

export function SourceLedger({ sources }: { sources: SourceRecord[] }) {
  return (
    <div className="source-ledger">
      {(sources ?? []).length ? (
        (sources ?? []).map((source) => (
          <article key={source.id}>
            <span
              className={`evidence-dot evidence-${source.status}`}
              aria-hidden="true"
            />
            <div>
              <strong>{source.label}</strong>
              <p>{source.detail}</p>
            </div>
            <div className="source-meta">
              <span>{source.type}</span>
              <time dateTime={source.observedAt}>
                {formatTimestamp(source.observedAt)}
              </time>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer">
                  Abrir fuente
                </a>
              ) : null}
            </div>
          </article>
        ))
      ) : (
        <p className="empty-state">No hay registros de fuentes para este análisis.</p>
      )}
    </div>
  );
}
