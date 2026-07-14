import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src/app", "src/components", "src/lib", "src/data"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const MOJIBAKE = /Ã|Â|â€|â€“|â€”|â€¢|â„¢|ðŸ|ï¿½|�/;

function extension(path: string) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return listSourceFiles(path);
    return EXTENSIONS.has(extension(path)) ? [path] : [];
  });
}

describe("copy encoding", () => {
  it("no deja mojibake en textos de src visibles para usuario", () => {
    const files = ROOTS.flatMap(listSourceFiles);
    const offenders = files.filter((file) =>
      MOJIBAKE.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
