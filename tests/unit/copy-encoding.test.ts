import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src/app", "src/components", "src/lib", "src/data", "tests", "scripts", "docs"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".md"]);
const EXCLUDED_SEGMENTS = new Set(["archive"]);
const EXCLUDED_FILES = new Set(["copy-encoding.test.ts"]);
const MOJIBAKE = /Ã|Â|â€|â†|âœ|ðŸ|ï¸|�/;

function extension(path: string) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

function listSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (EXCLUDED_SEGMENTS.has(name)) return [];
    if (EXCLUDED_FILES.has(name)) return [];
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return listSourceFiles(path);
    return EXTENSIONS.has(extension(path)) ? [path] : [];
  });
}

describe("copy encoding", () => {
  it("no deja mojibake en textos activos del proyecto", () => {
    const files = ROOTS.flatMap(listSourceFiles);
    const offenders = files.filter((file) =>
      MOJIBAKE.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
