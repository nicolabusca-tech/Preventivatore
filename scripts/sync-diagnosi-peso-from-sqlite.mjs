import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH = process.env.SQLITE_PATH || "prisma/dev.db";

function sqliteJson(sql) {
  const cmd = `sqlite3 "${SQLITE_PATH}" ".mode json" "${sql.replaceAll('"', '""')}"`;
  const out = execSync(cmd, { encoding: "utf8" }).trim();
  return out ? JSON.parse(out) : [];
}

const prisma = new PrismaClient();

async function main() {
  const rows = sqliteJson(
    `SELECT code, diagnosiPeso FROM Product WHERE diagnosiPeso IS NOT NULL AND diagnosiPeso != 0`
  );

  let updated = 0;
  let missing = 0;

  for (const r of rows) {
    const code = String(r.code);
    const peso = Number(r.diagnosiPeso || 0);
    const res = await prisma.product.updateMany({
      where: { code },
      data: { diagnosiPeso: peso },
    });
    if (res.count > 0) updated += res.count;
    else missing += 1;
  }

  console.log(
    JSON.stringify(
      { sqliteNonZero: rows.length, updated, missingCodes: missing },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

