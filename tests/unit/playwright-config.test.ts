// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({ config: vi.fn(() => ({ parsed: {} })) }));

describe("Playwright server isolation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("starts a dedicated server in CI", async () => {
    vi.stubEnv("CI", "1");

    const { default: config } = await import("../../playwright.config");

    expect(config.webServer).toMatchObject({ reuseExistingServer: false });
  });

  it("preserves local server reuse outside CI", async () => {
    vi.stubEnv("CI", undefined);

    const { default: config } = await import("../../playwright.config");

    expect(config.webServer).toMatchObject({ reuseExistingServer: true });
  });
});
