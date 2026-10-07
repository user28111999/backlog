import "dotenv/config";
import { db } from "../lib/db";
import { gameSchema } from "../lib/game";
import { gameList } from "./game-list";

async function main() {
  // Validate the complete list before writing anything. Estimates and media
  // stay empty until fetched from their actual providers.
  const rows = gameList.map(([
    importKey, title, category, status, platform, inputMethod, isModded, additionalNotes,
  ]) => ({
    importKey,
    ...gameSchema.parse({
      title, category, status, platform, inputMethod, isModded, additionalNotes,
      timePlayedHours: null,
      rating: null,
      releaseDate: null,
      hltbMainStoryHours: null,
      hltbMainExtraHours: null,
      hltbCompletionistHours: null,
    }),
  }));
  const existing = new Set((await db.game.findMany({
    where: { importKey: { in: rows.map((row) => row.importKey) } },
    select: { importKey: true },
  })).map((game) => game.importKey));
  const pending = rows.filter((row) => !existing.has(row.importKey));
  await db.$transaction(pending.map((row) => db.game.upsert({
    where: { importKey: row.importKey },
    create: row,
    update: {}, // Never replace edits, ratings, artwork, or playtime.
  })));
  console.log(`Game list: ${rows.length}; added: ${pending.length}; already present: ${existing.size}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unable to load game list.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
