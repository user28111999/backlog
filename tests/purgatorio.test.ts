import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGameCsv } from "../lib/import-csv";
import { matchHltb, emptyTimes } from "../lib/hltb";
import {
  parseScreenshotLinks,
  parseScreenshotImage,
} from "../lib/steam-screenshots";
import { splitPlatforms } from "../lib/platforms";
import { filterGames } from "../lib/library-filter";
import { gameSchema, type Game } from "../lib/game";

const header =
  "Category,Status,Game Title,Platform,Input Method,Modded,Additional Notes\r\n";
test("CSV preserves categories, repeated titles, multiple platforms, unknowns and quoted multiline notes", () => {
  const csv =
    header +
    'Played,Finished,Example,"PC, Switch",Controller,Yes,"First line\nSecond, with ""quotes"""\r\nFavorites,Finished,Example,PC,Controller,Unknown,Favorite\r\n';
  const rows = parseGameCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].data.platform, "PC, Switch");
  assert.equal(rows[0].data.status, "FINISHED");
  assert.equal(
    rows[0].data.additionalNotes,
    'First line\nSecond, with "quotes"',
  );
  assert.equal(rows[1].data.category, "Favorites");
  assert.equal(rows[1].data.isModded, null);
  assert.equal(rows[0].data.timePlayedHours, null);
  assert.equal(rows[0].data.hltbMainStoryHours, null);
  assert.deepEqual(rows[0].data.gallery, []);
  assert.notEqual(rows[0].importKey, rows[1].importKey);
  assert.deepEqual(parseGameCsv(csv), rows);
});
test("identical CSV rows get distinct but stable import keys", () => {
  const csv =
    header +
    "Played,Finished,Example,PC,Controller,No,\nPlayed,Finished,Example,PC,Controller,No,\n";
  const rows = parseGameCsv(csv);
  assert.notEqual(rows[0].importKey, rows[1].importKey);
  assert.deepEqual(rows, parseGameCsv(csv));
});
test("invalid import records fail instead of guessing fields", () => {
  assert.throws(() => parseGameCsv("title\nExample"), /Expected columns/);
  assert.throws(
    () =>
      parseGameCsv(header + "Played,NoSuchStatus,Example,PC,Controller,No,\n"),
    /unknown status/,
  );
});
test("HowLongToBeat maps actual API field names and treats zero/absent estimates as unknown", () => {
  assert.deepEqual(
    matchHltb(
      {
        title: "Portal 2",
        steamAppId: 620,
        mainStory: 8.5,
        mainStoryWithExtras: 14,
        completionist: 22,
      },
      "Portal 2",
      "620",
    ),
    {
      hltbMainStoryHours: 8.5,
      hltbMainExtraHours: 14,
      hltbCompletionistHours: 22,
    },
  );
  assert.deepEqual(
    matchHltb(
      [{ title: "Portal 2", mainStory: 0, mainStoryWithExtras: null }],
      "Portal 2",
    ),
    emptyTimes,
  );
});
test("HowLongToBeat rejects wrong or ambiguous matches and invalid response shapes", () => {
  assert.equal(matchHltb([{ title: "Portal" }], "Portal 2"), null);
  assert.equal(
    matchHltb([{ title: "Portal 2", steamAppId: 620 }], "Portal 2", "400"),
    null,
  );
  assert.equal(matchHltb([{ title: "Game" }, { title: "Game" }], "Game"), null);
  assert.throws(() => matchHltb({ error: "Unavailable" }, "Game"), /Invalid/);
});
test("platform tags are trimmed/deduplicated and filters match individual platforms", () => {
  assert.deepEqual(splitPlatforms(" PC, Switch, PC, pc, , PS5 "), [
    "PC",
    "Switch",
    "PS5",
  ]);
  const game = {
    ...gameSchema.parse({
      title: "Example",
      platform: "PC, Switch",
      status: "FINISHED",
    }),
    id: "test",
    createdAt: "",
    updatedAt: "",
  } as Game;
  assert.equal(
    filterGames([game], "", "FINISHED", "Switch", "title-asc").length,
    1,
  );
  assert.equal(filterGames([game], "", "ALL", "PS5", "title-asc").length, 0);
});
test("Steam screenshot parser accepts only Steam detail links and user-content images", () => {
  const html =
    '<a href="https://steamcommunity.com/sharedfiles/filedetails/?id=123">One</a><a href="/sharedfiles/filedetails/?id=123">Duplicate</a><a href="https://evil.example/sharedfiles/filedetails/?id=999">Wrong</a>';
  assert.deepEqual(parseScreenshotLinks(html), [
    "https://steamcommunity.com/sharedfiles/filedetails/?id=123",
  ]);
  assert.equal(
    parseScreenshotImage(
      '<meta property="og:image" content="https://images.steamusercontent.com/ugc/123/screen.jpg">',
    ),
    "https://images.steamusercontent.com/ugc/123/screen.jpg",
  );
  assert.equal(
    parseScreenshotImage(
      '<a class="actualmedia" href="https://steamuserimages-a.akamaihd.net/ugc/123/image.jpg"></a>',
    ),
    "https://steamuserimages-a.akamaihd.net/ugc/123/image.jpg",
  );
  assert.equal(
    parseScreenshotImage(
      '<meta property="og:image" content="https://evil.example/placeholder.jpg">',
    ),
    null,
  );
  assert.deepEqual(parseScreenshotLinks("<p>No public screenshots</p>"), []);
});
