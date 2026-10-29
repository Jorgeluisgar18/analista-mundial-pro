import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production build configuration", () => {
  it("uses Webpack for the Netlify Next.js server bundle", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.build).toBe("next build --webpack");
  });
});
