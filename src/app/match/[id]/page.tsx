import { notFound } from "next/navigation";
import { AnalysisCabin } from "@/components/analysis/AnalysisCabin";
import { getAnalysis } from "@/lib/services/analysisService";
import { isProductionDataUnavailableError } from "@/lib/runtime/productionPolicy";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let result: Awaited<ReturnType<typeof getAnalysis>>;
  try {
    result = await getAnalysis(id, { persist: false });
  } catch (error) {
    if (isProductionDataUnavailableError(error)) {
      return (
        <main className="page-shell">
          <section className="empty-state" role="status">
            <h1>Datos reales no disponibles</h1>
            <p>La configuración operativa no está disponible en este momento.</p>
          </section>
        </main>
      );
    }
    throw error;
  }
  if (!result) notFound();
  return (
    <AnalysisCabin
      initialAnalysis={result.analysis}
      dataset={result.dataset}
    />
  );
}
