import { ChevronIcon, ClockIcon } from "@/components/analysis/Icons";
import { formatTimestamp } from "@/lib/format/date";
import type { AnalysisResult } from "@/types/domain";

export interface NavSection {
  id: string;
  label: string;
  subs: readonly string[];
}

export function AnalysisSidebar({
  navigation,
  activeSection,
  activeSubsection,
  analysis,
  onSelectSection,
  onSelectSubsection,
}: {
  navigation: readonly NavSection[];
  activeSection: string;
  activeSubsection: string;
  analysis: AnalysisResult;
  onSelectSection: (section: NavSection) => void;
  onSelectSubsection: (subsection: string) => void;
}) {
  return (
    <aside className="analysis-sidebar" aria-label="Secciones del análisis">
      <span className="sidebar-title">Informe del partido</span>
      {navigation.map((section) => {
        const active = activeSection === section.id;
        return (
          <div className="sidebar-group" key={section.id}>
            <button
              type="button"
              className={active ? "sidebar-button active" : "sidebar-button"}
              onClick={() => onSelectSection(section)}
              aria-expanded={active}
            >
              <span>{section.label}</span>
              <ChevronIcon open={active} />
            </button>
            {active ? (
              <div className="sidebar-subnav">
                {section.subs.map((subsection) => (
                  <button
                    type="button"
                    className={activeSubsection === subsection ? "selected" : ""}
                    key={subsection}
                    onClick={() => onSelectSubsection(subsection)}
                    aria-current={activeSubsection === subsection ? "true" : undefined}
                  >
                    {subsection}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="sidebar-freshness">
        <ClockIcon />
        <span>
          Último snapshot
          <strong>{formatTimestamp(analysis.generatedAt)}</strong>
        </span>
      </div>
    </aside>
  );
}
