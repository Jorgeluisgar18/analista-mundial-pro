const GENERIC_TEAM_TOKENS = new Set([
  "club",
  "de",
  "la",
  "el",
  "the",
  "fc",
  "cf",
  "sc",
  "ac",
  "cd",
  "ud",
  "afc",
  "real",
  "united",
  "city",
]);

export function normalizeProviderTeamName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bbrasil\b/g, "brazil")
    .replace(/\bnational (football )?team\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function contentTokens(value: string) {
  return normalizeProviderTeamName(value)
    .split(" ")
    .filter((token) => token && !GENERIC_TEAM_TOKENS.has(token));
}

function isSubset(candidate: string[], target: string[]) {
  if (candidate.length < 2) return false;
  const targetSet = new Set(target);
  return candidate.every((token) => targetSet.has(token));
}

export function providerTeamNamesMatch(left?: string, right?: string) {
  if (!left || !right) return false;
  const a = normalizeProviderTeamName(left);
  const b = normalizeProviderTeamName(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const leftTokens = contentTokens(a);
  const rightTokens = contentTokens(b);
  if (
    leftTokens.length === 1 &&
    rightTokens.length === 1 &&
    leftTokens[0] === rightTokens[0]
  ) {
    return true;
  }
  return isSubset(leftTokens, rightTokens) || isSubset(rightTokens, leftTokens);
}
