type TupleScore = [number, number];

function isTupleScore(value: unknown): value is TupleScore {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => Number.isInteger(item))
  );
}

export function normalizeOpenFootballScore(value: unknown) {
  if (isTupleScore(value)) {
    return { fullTime: value, halfTime: undefined };
  }
  if (value && typeof value === "object") {
    const record = value as { ft?: unknown; ht?: unknown };
    return {
      fullTime: isTupleScore(record.ft) ? record.ft : undefined,
      halfTime: isTupleScore(record.ht) ? record.ht : undefined,
    };
  }
  return { fullTime: undefined, halfTime: undefined };
}
