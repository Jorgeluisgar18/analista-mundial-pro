import { describe, it } from "vitest";

export function hasPostgresDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return Boolean(
    databaseUrl &&
      !databaseUrl.startsWith("file:") &&
      databaseUrl.startsWith("postgres"),
  );
}

export const describeWithDatabase = hasPostgresDatabaseUrl()
  ? describe
  : describe.skip;

export const itWithDatabase = hasPostgresDatabaseUrl() ? it : it.skip;
