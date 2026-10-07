import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseScreenshotLinks,
  parseScreenshotImage,
} from "../lib/steam-screenshots";
import { splitPlatforms } from "../lib/platforms";
import { filterGames } from "../lib/library-filter";
import { gameSchema, type Game } from "../lib/game";

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
