import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyTimes,
  fetchHltb,
  findHltbSearchPath,
  HltbProviderError,
  matchHltb,
  parseHltbPage,
} from "../lib/hltb";

const portal = {
  game_id: 7231,
  game_name: "Portal 2",
  comp_main: 30600,
  comp_plus: 50400,
  comp_100: 79200,
};
const expected = {
  hltbId: "7231",
  hltbMainStoryHours: 8.5,
  hltbMainExtraHours: 14,
  hltbCompletionistHours: 22,
};
const page = (rows: unknown[]) =>
  `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { game: { data: { game: rows } } } } })}</script>`;

test("HLTB converts the site's seconds to hours without confusing similar games", () => {
  assert.deepEqual(matchHltb([portal], "Portal 2"), expected);
  assert.equal(matchHltb([portal], "Portal"), null);
  assert.equal(matchHltb([portal, portal], "Portal 2"), null);
  assert.equal(matchHltb([], "Portal 2"), null);
  assert.deepEqual(
    matchHltb(
      [{ ...portal, comp_main: 0, comp_plus: null, comp_100: undefined }],
      "Portal 2",
    ),
    { ...emptyTimes, hltbId: "7231" },
  );
  assert.throws(
    () => matchHltb([{ ...portal, comp_main: "8 hours" }], "Portal 2"),
    HltbProviderError,
  );
});
test("manual HLTB ID selects only that game from structured page data", () => {
  assert.deepEqual(parseHltbPage(page([portal]), "7231"), expected);
  assert.equal(parseHltbPage(page([portal]), "400"), null);
  assert.throws(
    () => parseHltbPage("<html>Access denied</html>", "7231"),
    /format changed/,
  );
  assert.throws(
    () => parseHltbPage('<script id="__NEXT_DATA__">invalid</script>', "7231"),
    /invalid game page/,
  );
});
test("search endpoint discovery follows the site's POST call", () => {
  assert.equal(
    findHltbSearchPath('fetch("/api/finder/v2",{method:"POST",body:t})'),
    "/api/finder/v2",
  );
  assert.equal(
    findHltbSearchPath('fetch("/api/unrelated",{method:"GET"})'),
    null,
  );
  assert.equal(
    findHltbSearchPath('fetch("https://evil.example/api/s",{method:"POST"})'),
    null,
  );
});
test("title search initializes auth, carries session cookies and posts the challenge", async () => {
  const calls: string[] = [];
  let initCalls = 0;
  const result = await fetchHltb(
    "Portal 2",
    undefined,
    async (url, options) => {
      calls.push(url);
      assert.ok(options?.signal);
      if (url.includes("/init?") && initCalls++ === 0)
        return new Response(null, { status: 404 });
      if (url.endsWith("/"))
        return new Response(
          '<script src="https://evil.example/_next/static/chunks/a.js"></script><script src="/_next/static/chunks/app.js"></script>',
          { headers: { "Set-Cookie": "session=abc; Path=/" } },
        );
      assert.equal(new Headers(options?.headers).get("cookie"), "session=abc");
      if (url.endsWith("app.js"))
        return new Response('fetch("/api/search/site",{method:"POST"})');
      if (url.includes("/init?"))
        return Response.json({
          token: "test-token",
          authKey: "challenge",
          authValue: "answer",
        });
      assert.equal(url, "https://howlongtobeat.com/api/search/site");
      const h = new Headers(options?.headers);
      assert.equal(h.get("x-auth-token"), "test-token");
      assert.equal(h.get("x-hp-key"), "challenge");
      assert.equal(h.get("x-hp-val"), "answer");
      const body = JSON.parse(String(options?.body));
      assert.deepEqual(body.searchTerms, ["Portal", "2"]);
      assert.equal(body.challenge, "answer");
      return Response.json({ data: [portal] });
    },
  );
  assert.deepEqual(result, expected);
  assert.equal(calls.length, 5);
});
test("current search endpoint works without loading a blocked homepage", async () => {
  const result = await fetchHltb(
    "Portal 2",
    undefined,
    async (url, options) => {
      if (url.includes("/api/search/site/init?"))
        return Response.json({ token: "test-token" });
      assert.equal(url, "https://howlongtobeat.com/api/search/site");
      assert.equal(options?.method, "POST");
      return Response.json({ data: [portal] });
    },
  );
  assert.deepEqual(result, expected);
});
test("manual ID bypasses all title search and auth initialization", async () => {
  let calls = 0;
  const result = await fetchHltb(
    "Any custom library title",
    "7231",
    async (url) => {
      calls++;
      assert.equal(url, "https://howlongtobeat.com/game/7231");
      return new Response(page([portal]));
    },
  );
  assert.equal(calls, 1);
  assert.deepEqual(result, expected);
});
test("an expired search session is refreshed once, with a bounded retry", async () => {
  let inits = 0,
    searches = 0;
  const result = await fetchHltb(
    "Portal 2",
    undefined,
    async (url, options) => {
      if (url.includes("/init?"))
        return Response.json({ token: `token-${++inits}` });
      searches++;
      if (searches === 1)
        return Response.json(
          { error: "Session expired or invalid fingerprint" },
          { status: 403 },
        );
      assert.equal(
        new Headers(options?.headers).get("x-auth-token"),
        "token-2",
      );
      return Response.json({ data: [portal] });
    },
  );
  assert.deepEqual(result, expected);
  assert.equal(inits, 2);
  assert.equal(searches, 2);
  let count = 0;
  await assert.rejects(
    fetchHltb("Portal 2", undefined, async (url) => {
      if (url.includes("/init?")) return Response.json({ token: "token" });
      count++;
      return Response.json(
        { error: "Session expired or invalid fingerprint" },
        { status: 403 },
      );
    }),
    /rejected the search session/,
  );
  assert.equal(count, 2);
});
test("missing ID is a no-match; blocked requests and changed formats are failures", async () => {
  assert.equal(
    await fetchHltb(
      "Title",
      "7231",
      async () => new Response(null, { status: 404 }),
    ),
    null,
  );
  await assert.rejects(
    fetchHltb("Title", "7231", async () => new Response(null, { status: 403 })),
    /blocked.*403/,
  );
  await assert.rejects(
    fetchHltb("Title", "7231", async () => {
      throw new Error("socket failure");
    }),
    /Cannot reach/,
  );
  await assert.rejects(
    fetchHltb("Title", "7231", async () => new Response("wrong page")),
    HltbProviderError,
  );
  await assert.rejects(fetchHltb("Title", "1; evil"), /valid numeric/);
});
