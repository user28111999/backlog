import { db } from "./db";
import { parseGameCsv } from "./import-csv";

export async function importGames(text: string) {
  // Validate every row before starting a transaction. A bad row cannot leave a partial import.
  const rows = parseGameCsv(text);
  const existing = new Set(
    (
      await db.game.findMany({
        where: { importKey: { not: null } },
        select: { importKey: true },
      })
    ).map((g) => g.importKey),
  );
  const pending = rows.filter((row) => !existing.has(row.importKey));
  if (pending.length)
    await db.$transaction(
      pending.map((row) =>
        db.game.create({ data: { ...row.data, importKey: row.importKey } }),
      ),
    );
  return {
    rows: rows.length,
    imported: pending.length,
    skipped: rows.length - pending.length,
  };
}
