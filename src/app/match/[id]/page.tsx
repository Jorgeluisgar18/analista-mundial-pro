import { notFound } from "next/navigation";
import { AnalysisCabin } from "@/components/analysis/AnalysisCabin";
import { analyzeMatch } from "@/lib/analysis/analysisEngine";
import { matchService } from "@/lib/services/matchService";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await matchService.getById(id);
  if (!dataset) notFound();
  const analysis = analyzeMatch(dataset);
  return <AnalysisCabin initialAnalysis={analysis} dataset={dataset} />;
}
