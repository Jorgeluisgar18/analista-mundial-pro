// @vitest-environment node
import { Socket } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("Prisma runtime initialization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NETLIFY_DB_URL", "");
    vi.stubEnv("NETLIFY_DATABASE_URL", "");
    vi.stubEnv("NETLIFY_DATABASE_URL_UNPOOLED", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("loads the generated TypeScript client without opening a connection", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://unit:unit@127.0.0.1:1/unit");
    const connect = vi.spyOn(Socket.prototype, "connect");
    const { getDatabaseRuntimeStatus, prisma } = await import("@/lib/db/prisma");
    const status = getDatabaseRuntimeStatus();

    try {
      expect(status).toEqual({ status: "configured", error: null });
      expect(connect).not.toHaveBeenCalled();
    } finally {
      if (status.status === "configured") await prisma.$disconnect();
    }
  });

  it("preserves unavailable status and safe empty reads without database configuration", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDatabaseRuntimeStatus, prisma } = await import("@/lib/db/prisma");

    expect(getDatabaseRuntimeStatus().status).toBe("unavailable");
    await expect(prisma.match.findMany()).resolves.toEqual([]);
    await expect(
      prisma.$transaction((transaction) => transaction.match.findMany()),
    ).resolves.toEqual([]);
  });
});
