import { demoMatches } from "@/data/demo";

export async function GET() {
  const competitions = Array.from(
    new Map(
      demoMatches.map((match) => [match.competition.id, match.competition]),
    ).values(),
  );
  return Response.json({
    competitions,
    mode: process.env.FOOTBALL_API_KEY ? "api-ready" : "demo",
  });
}
