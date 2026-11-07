import { randomUUID } from "node:crypto";
import pg from "pg";
import { expect, it, vi } from "vitest";
import { checkPersistentRateLimit } from "@/lib/http/persistentRateLimit";

vi.mock("server-only", () => ({}));

type Transaction = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

const postgresTest = process.env.RATE_LIMIT_TEST_POSTGRES === "1" ? it : it.skip;

postgresTest("enforces the shared cap during concurrent first inserts on PostgreSQL", async () => {
  const port = Number(process.env.PGPORT ?? "5432");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid test port");
  const password = process.env.RATE_LIMIT_TEST_PASSWORD;
  if (!password) throw new Error("Explicit disposable-test password required");
  // Fixed loopback/test database; never consume application connection URLs.
  const config = {
    host: "127.0.0.1", port, database: "rate_limit_ci", user: "postgres",
    password, ssl: false as const, connectionTimeoutMillis: 5000,
  };
  const schema = `rate_limit_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ ...config, max: 1 });
  const total = 12;
  const pool = new pg.Pool({ ...config, max: total, options: `-c search_path=${schema}` });
  let arrivals = 0;
  let release = () => {};
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const timeout = setTimeout(() => release(), 5000);
  async function read<T>(
    execute: (query: string, values: unknown[]) => Promise<{ rows: unknown[] }>,
    query: string,
    ...values: unknown[]
  ): Promise<T> {
    const result = await execute(query, values);
    // Force a valid race schedule: every legacy SELECT observes no row before INSERT.
    if (query.startsWith("SELECT") && query.includes("FOR UPDATE") && !result.rows.length) {
      arrivals += 1;
      if (arrivals === total) release();
      await barrier;
    }
    return result.rows as T;
  }
  const database = {
    $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]) {
      return read<T>((sql, args) => pool.query(sql, args), query, ...values);
    },
    async $transaction<T>(callback: (transaction: Transaction) => Promise<T>) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await callback({
          $queryRawUnsafe<TQuery = unknown>(query: string, ...values: unknown[]) {
            return read<TQuery>((sql, args) => client.query(sql, args), query, ...values);
          },
          async $executeRawUnsafe(query: string, ...values: unknown[]) {
            return (await client.query(query, values)).rowCount ?? 0;
          },
        });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(`CREATE TABLE "RateLimitBucket" (
      "id" TEXT PRIMARY KEY, "scope" TEXT NOT NULL, "clientKey" TEXT NOT NULL,
      "count" INTEGER NOT NULL, "resetsAt" TIMESTAMP(3) NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE ("scope", "clientKey")
    )`);
    const request = new Request("http://local/api/test");
    const options = { limit: 3, windowMs: 60_000, database };
    const results = await Promise.all(Array.from({ length: total }, () =>
      checkPersistentRateLimit(request, schema, options),
    ));
    expect(results.filter((result) => result === null)).toHaveLength(options.limit);
    const blocked = results.filter((result) => result !== null);
    expect(blocked).toHaveLength(total - options.limit);
    expect(blocked.every((result) => result.status === 429 &&
      result.headers.get("x-ratelimit-storage") === "postgres")).toBe(true);
    await pool.query('UPDATE "RateLimitBucket" SET "resetsAt" = NOW() - INTERVAL \'1 minute\'');
    expect(await checkPersistentRateLimit(request, schema, options)).toBeNull();
    expect((await pool.query('SELECT "count" FROM "RateLimitBucket"')).rows).toEqual([{ count: 1 }]);
  } finally {
    release();
    clearTimeout(timeout);
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
}, 30_000);
