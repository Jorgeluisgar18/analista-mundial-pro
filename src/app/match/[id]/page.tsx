import { notFound } from "next/navigation";
import { AnalysisCabin } from "@/components/analysis/AnalysisCabin";
import { getAnalysis } from "@/lib/services/analysisService";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getAnalysis(id);
  if (!result) notFound();
  return (
    <AnalysisCabin
      initialAnalysis={result.analysis}
      dataset={result.dataset}
    />
  );
}
