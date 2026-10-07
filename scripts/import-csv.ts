import "dotenv/config";
import { readFile } from "node:fs/promises";
import { importGames } from "../lib/import-games";
import { parseGameCsv } from "../lib/import-csv";
import { db } from "../lib/db";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => arg !== "--dry-run");
  if (!file)
    throw new Error(
      'Usage: npm run import:csv -- "/path/to/Game List.csv" [--dry-run]',
    );
  const text = await readFile(file, "utf8");
  if (args.includes("--dry-run")) {
    const rows = parseGameCsv(text);
    const counts: Record<string, number> = {};
    for (const row of rows)
      counts[row.data.status] = (counts[row.data.status] || 0) + 1;
    console.log(
      JSON.stringify(
        {
          rows: rows.length,
          statuses: counts,
          duplicateTitles:
            rows.length -
            new Set(rows.map((row) => row.data.title.toLowerCase())).size,
        },
        null,
        2,
      ),
    );
  } else console.log(JSON.stringify(await importGames(text), null, 2));
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
