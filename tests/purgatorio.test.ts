import { test } from "node:test";
import assert from "node:assert/strict";
import { matchHltb, emptyTimes, fetchHltb } from "../lib/hltb";
import { HowLongToBeat } from "howlongtobeat-js";
import {
  parseScreenshotLinks,
  parseScreenshotImage,
} from "../lib/steam-screenshots";
import { splitPlatforms } from "../lib/platforms";
import { filterGames } from "../lib/library-filter";
import { gameSchema, type Game } from "../lib/game";

test("HowLongToBeat maps actual API field names and treats zero/absent estimates as unknown", () => {
  assert.deepEqual(
    matchHltb(
      [{
        gameName: "Portal 2",
        similarity: 1,
        mainStory: 8.5,
        mainExtra: 14,
        completionist: 22,
      }],
    ),
    {
      hltbMainStoryHours: 8.5,
      hltbMainExtraHours: 14,
      hltbCompletionistHours: 22,
    },
  );
  assert.deepEqual(
    matchHltb(
      [{ gameName: "Portal 2", similarity: 1, mainStory: 0, mainExtra: null }],
    ),
    emptyTimes,
  );
});
test("HowLongToBeat selects the highest similarity and rejects weak/invalid results", () => {
  assert.equal(matchHltb([{ gameName: "Portal", similarity: 0.6 }]), null);
  assert.equal(matchHltb([]), null);
  assert.deepEqual(matchHltb([
    { gameName: "Portal", similarity: 0.8, mainStory: 3 },
    { gameName: "Portal 2", similarity: 1, mainStory: 8.5 },
  ]), { ...emptyTimes, hltbMainStoryHours: 8.5 });
  assert.throws(() => matchHltb({ error: "Unavailable" }), /Invalid/);
});
test("HowLongToBeat distinguishes provider failures from a confirmed no-match", async (t) => {
  const search = t.mock.method(HowLongToBeat.prototype, "search", async () => null);
  await assert.rejects(fetchHltb("Portal 2"), /unavailable/);
  search.mock.mockImplementation(async () => []);
  assert.equal(await fetchHltb("Portal 2"), null);
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
