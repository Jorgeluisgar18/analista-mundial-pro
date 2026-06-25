export function problem(
  status: number,
  title: string,
  detail: string,
  extra: Record<string, unknown> = {},
) {
  return Response.json(
    {
      type: "about:blank",
      title,
      status,
      detail,
      ...extra,
    },
    {
      status,
      headers: { "content-type": "application/problem+json" },
    },
  );
}
