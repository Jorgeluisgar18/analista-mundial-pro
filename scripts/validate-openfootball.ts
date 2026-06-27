import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dataDir = process.env.OPENFOOTBALL_DATA_DIR ?? "data/openfootball";

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listJsonFiles(path);
      return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
    }),
  );
  return nested.flat();
}

async function main() {
  if (!existsSync(dataDir)) {
    console.log(
      JSON.stringify({
        ok: true,
        dataDir,
        fileCount: 0,
        note: "OpenFootball local cache is optional and ignored by Git.",
      }),
    );
    return;
  }

  const files = await listJsonFiles(dataDir);
  for (const file of files) {
    JSON.parse(await readFile(file, "utf8"));
  }

  console.log(JSON.stringify({ ok: true, dataDir, fileCount: files.length }));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
