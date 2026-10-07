import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { gameSchema, type GameInput, statuses } from "./game";
import { splitPlatforms } from "./platforms";

const columns = [
  "Category",
  "Status",
  "Game Title",
  "Platform",
  "Input Method",
  "Modded",
  "Additional Notes",
];
export type ImportedGame = { data: GameInput; importKey: string };
export function parseGameCsv(text: string): ImportedGame[] {
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    record_delimiter: ["\r\n", "\n", "\r"],
    trim: true,
    max_record_size: 100000,
  }) as Record<string, string>[];
  if (!rows.length) throw new Error("The CSV has no game rows.");
  if (rows.length > 10000)
    throw new Error("Import at most 10,000 rows at a time.");
  if (!columns.every((column) => Object.hasOwn(rows[0], column)))
    throw new Error(`Expected columns: ${columns.join(", ")}`);
  const occurrences = new Map<string, number>();
  return rows.map((row, index) => {
    const status = row.Status.trim().toUpperCase().replace(/\s+/g, "_");
    if (!statuses.includes(status as (typeof statuses)[number]))
      throw new Error(`Row ${index + 2}: unknown status “${row.Status}”.`);
    const modded = row.Modded.trim().toLowerCase();
    if (!["yes", "no", "unknown", ""].includes(modded))
      throw new Error(
        `Row ${index + 2}: Modded must be Yes, No, Unknown, or blank.`,
      );
    const data = gameSchema.parse({
      title: row["Game Title"],
      category: row.Category || null,
      status,
      platform: splitPlatforms(row.Platform).join(", "),
      inputMethod: row["Input Method"],
      isModded: modded === "yes" ? true : modded === "no" ? false : null,
      additionalNotes: row["Additional Notes"] || null,
      timePlayedHours: null,
      rating: null,
      releaseDate: null,
      hltbMainStoryHours: null,
      hltbMainExtraHours: null,
      hltbCompletionistHours: null,
      coverUrl: "",
      heroUrl: "",
      logoUrl: "",
      trailerUrl: "",
      gallery: [],
    });
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(columns.map((key) => row[key])))
      .digest("hex");
    const occurrence = occurrences.get(fingerprint) || 0;
    occurrences.set(fingerprint, occurrence + 1);
    return { data, importKey: `sheets-v1:${fingerprint}:${occurrence}` };
  });
}
