import { supportedCompetitions } from "@/lib/providers/competitionCatalog";
import { hasConfiguredFootballProvider } from "@/lib/providers/providerConfig";

export async function GET() {
  return Response.json({
    competitions: supportedCompetitions.map((competition) => ({
      id: competition.slug,
      slug: competition.slug,
      name: competition.name,
      kind: competition.kind,
      footballDataCode: competition.footballDataCode,
    })),
    mode: hasConfiguredFootballProvider() ? "api-ready" : "demo",
  });
}
