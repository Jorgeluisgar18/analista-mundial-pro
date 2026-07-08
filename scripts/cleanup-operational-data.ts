import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { cleanupOldOperationalData } from "@/lib/maintenance/cleanup";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();

async function main() {
  if (!databaseUrl || databaseUrl.startsWith("file:")) {
    console.log(
      JSON.stringify({
        ok: true,
        cleaned: false,
        note: "DATABASE_URL no está configurada con Postgres/Neon; no se ejecutó limpieza.",
      }),
    );
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

  try {
    const result = await cleanupOldOperationalData({ database: prisma });
    console.log(JSON.stringify({ ok: true, cleaned: true, ...result }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
