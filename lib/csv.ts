import type { Game } from "./game";
export const csvFields: (keyof Game)[] = [
  "id",
  "title",
  "releaseDate",
  "status",
  "platform",
  "timePlayedHours",
  "rating",
  "reviewNotes",
  "inputMethod",
  "isModded",
  "modNotes",
  "additionalNotes",
  "steamAppId",
  "coverUrl",
  "logoUrl",
  "heroUrl",
  "trailerUrl",
  "gallery",
  "hltbMainStoryHours",
  "hltbMainExtraHours",
  "hltbCompletionistHours",
  "createdAt",
  "updatedAt",
];
export function toCSV(games: Game[]) {
  const cell = (value: unknown) => {
    let s =
      value == null
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return [
    csvFields.join(","),
    ...games.map((g) => csvFields.map((k) => cell(g[k])).join(",")),
  ].join("\r\n");
}
export function exportCSV(games: Game[]) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + toCSV(games)], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `backlog-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
