import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getSession, createNeonAuth } = vi.hoisted(() => ({
  getSession: vi.fn(),
  createNeonAuth: vi.fn(),
}));
vi.mock("@neon/auth/next/server", () => ({ createNeonAuth }));
import { requireAnalyst } from "@/lib/auth/analyst";

describe("manual override session authorization", () => {
  beforeEach(() => {
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test/db/auth");
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "x".repeat(32));
    vi.stubEnv("ANALYST_ADMIN_EMAIL", "admin@example.test");
    vi.stubEnv("ANALYST_OVERRIDE_TOKEN", "");
    createNeonAuth.mockReturnValue({ getSession });
    getSession.mockReset().mockResolvedValue({ data: null, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());
  const request = () =>
    new Request("https://app.example.test/api/match/demo/overrides");

  it("allows the verified administrator's active session", async () => {
    getSession.mockResolvedValue({
      data: { user: { email: "ADMIN@example.test", emailVerified: true } },
      error: null,
    });
    expect(await requireAnalyst(request())).toBeNull();
    expect(getSession).toHaveBeenCalledWith({
      query: { disableCookieCache: "true" },
    });
  });
  it("requires a session", async () => {
    expect((await requireAnalyst(request()))?.status).toBe(401);
  });
  it.each([
    { email: "other@example.test", emailVerified: true },
    { email: "admin@example.test", emailVerified: false },
    { email: "admin@example.test", emailVerified: "true" },
  ])("rejects a non-admin or unverified identity: %j", async (user) => {
    getSession.mockResolvedValue({ data: { user }, error: null });
    expect((await requireAnalyst(request()))?.status).toBe(403);
  });
  it("does not accept the legacy token without a session", async () => {
    vi.stubEnv("ANALYST_OVERRIDE_TOKEN", "legacy-fixture");
    const req = new Request(request(), {
      headers: { "x-analyst-token": "legacy-fixture" },
    });
    expect((await requireAnalyst(req))?.status).toBe(401);
  });
  it("fails closed on session verification failure", async () => {
    getSession.mockRejectedValue(new Error("private upstream detail"));
    const result = await requireAnalyst(request());
    expect(result?.status).toBe(503);
    expect(await result?.text()).not.toContain("private upstream detail");
  });
  it("fails closed before requesting a session when configuration is missing", async () => {
    vi.stubEnv("ANALYST_ADMIN_EMAIL", "");
    expect((await requireAnalyst(request()))?.status).toBe(503);
    expect(getSession).not.toHaveBeenCalled();
  });
});
