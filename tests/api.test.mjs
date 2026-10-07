import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const headers = { "Content-Type": "application/json" };
const request = (path, method, body) =>
  fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
test("SQLite game lifecycle, validation, and partial update preservation", async (t) => {
  let id;
  try {
    await t.test("create and read all game fields", async () => {
      const res = await request("/api/games", "POST", {
        title: "API smoke test",
        platform: "Switch",
        status: "PLAYING",
        timePlayedHours: 12.5,
        isModded: true,
        modNotes: "Test mod",
        reviewNotes: 'A review, with "quotes"\nand newlines.',
        gallery: ["https://example.com/screenshot.jpg"],
        hltbMainStoryHours: 20,
      });
      assert.equal(res.status, 201);
      const game = await res.json();
      id = game.id;
      assert.ok(id);
      assert.equal(game.platform, "Switch");
      assert.equal(game.hltbMainStoryHours, 20);
      const read = await request(`/api/games/${id}`, "GET");
      assert.equal(read.status, 200);
      assert.equal((await read.json()).modNotes, "Test mod");
    });
    await t.test("rating update preserves unrelated fields", async () => {
      const res = await request(`/api/games/${id}`, "PATCH", { rating: 5 });
      assert.equal(res.status, 200);
      const game = await res.json();
      assert.equal(game.rating, 5);
      assert.equal(game.status, "PLAYING");
      assert.equal(game.platform, "Switch");
      assert.equal(game.timePlayedHours, 12.5);
      assert.equal(game.isModded, true);
      assert.equal(game.gallery.length, 1);
    });
    await t.test(
      "invalid rating, status, playtime and media are rejected",
      async () => {
        for (const body of [
          { rating: 6 },
          { status: "UNKNOWN" },
          { timePlayedHours: -1 },
          { coverUrl: "javascript:alert(1)" },
        ])
          assert.equal(
            (await request(`/api/games/${id}`, "PATCH", body)).status,
            400,
          );
        assert.equal(
          (await request("/api/games", "POST", { title: " " })).status,
          400,
        );
      },
    );
    await t.test(
      "invalid JSON and cross-origin writes are rejected",
      async () => {
        assert.equal(
          (
            await fetch(base + "/api/games", {
              method: "POST",
              headers,
              body: "{",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await fetch(base + "/api/games", {
              method: "POST",
              headers: { ...headers, Origin: "https://unrelated.example" },
              body: "{}",
            })
          ).status,
          403,
        );
      },
    );
    await t.test("library lists the persisted entry", async () => {
      const res = await request("/api/games", "GET");
      assert.equal(res.status, 200);
      assert.ok((await res.json()).some((g) => g.id === id));
    });
    await t.test("delete and missing entry responses", async () => {
      assert.equal((await request(`/api/games/${id}`, "DELETE")).status, 204);
      assert.equal((await request(`/api/games/${id}`, "GET")).status, 404);
      assert.equal(
        (await request(`/api/games/${id}`, "PATCH", { rating: 1 })).status,
        404,
      );
      assert.equal((await request(`/api/games/${id}`, "DELETE")).status, 404);
      id = undefined;
    });
  } finally {
    if (id) await request(`/api/games/${id}`, "DELETE");
  }
});
