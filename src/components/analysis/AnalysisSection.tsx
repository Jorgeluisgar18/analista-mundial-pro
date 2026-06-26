import type { ReactNode } from "react";

export function AnalysisSection({
  title,
  intro,
  aside,
  children,
}: {
  title: string;
  intro: string | ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="analysis-section">
      <header className="analysis-section-header">
        <div>
          <h2>{title}</h2>
          <p>{intro}</p>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}
