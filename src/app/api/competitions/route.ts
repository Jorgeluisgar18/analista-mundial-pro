import { supportedCompetitions } from "@/lib/providers/competitionCatalog";

export async function GET() {
  return Response.json({
    competitions: supportedCompetitions.map((competition) => ({
      id: competition.slug,
      slug: competition.slug,
      name: competition.name,
      kind: competition.kind,
      footballDataCode: competition.footballDataCode,
    })),
    mode: process.env.FOOTBALL_API_KEY ? "api-ready" : "demo",
  });
}
