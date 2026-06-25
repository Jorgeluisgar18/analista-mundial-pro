export async function GET() {
  const now = new Date();
  return Response.json({
    usage: [
      {
        provider: "API-Football",
        configured: Boolean(process.env.FOOTBALL_API_KEY),
        limit: 100,
        period: "day",
        note: "Presupuesto conservado mediante consultas bajo demanda.",
      },
      {
        provider: "The Odds API",
        configured: Boolean(process.env.ODDS_API_KEY),
        limit: 500,
        period: "month",
        note: "Cuotas consultadas solo al abrir o actualizar un partido.",
      },
      {
        provider: "Open-Meteo",
        configured: true,
        limit: null,
        period: "fair-use",
        note: "Sin clave para uso personal no comercial.",
      },
    ],
    checkedAt: now.toISOString(),
  });
}
