import { readFile } from "node:fs/promises";

const sourceFile = process.env.OPENFOOTBALL_SOURCE_FILE;

async function main() {
  if (!sourceFile) {
    console.log(
      JSON.stringify({
        ok: true,
        imported: false,
        note: "Set OPENFOOTBALL_SOURCE_FILE to inspect a local cached JSON file.",
      }),
    );
    return;
  }

  const raw = JSON.parse(await readFile(sourceFile, "utf8")) as unknown;
  const matchCount =
    raw && typeof raw === "object" && Array.isArray((raw as { matches?: unknown }).matches)
      ? (raw as { matches: unknown[] }).matches.length
      : 0;

  console.log(
    JSON.stringify({
      ok: true,
      imported: false,
      sourceFile,
      matchCount,
      note: "Foundation only: persistence import will be wired in a later task.",
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
