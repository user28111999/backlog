import { NextResponse } from "next/server";
import { z } from "zod";
import { emptyTimes, fetchHltb } from "@/lib/hltb";
import { apiError, sameOrigin } from "@/lib/http";
import type { GameInput } from "@/lib/game";
import { providerFetch } from "@/lib/provider-fetch";
const input = z.object({
  title: z.string().trim().min(1).max(200),
  steamAppId: z.string().regex(/^\d+$/).optional(),
});
async function json(url: string, init?: RequestInit) {
  const r = await providerFetch(url, {
    ...init,
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Provider HTTP ${r.status}`);
  return r.json();
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const { title, steamAppId } = input.parse(await req.json());
    const data: Partial<GameInput> = {};
    const warnings: string[] = [];
    const sources: string[] = [];
    const hltb = fetchHltb(title, steamAppId)
      .then((match) => {
        if (!match) {
          Object.assign(data, emptyTimes);
          return;
        }
        Object.assign(data, match);
        sources.push("HowLongToBeat");
      })
      .catch(() => {
        warnings.push(
          "HowLongToBeat is unavailable. Missing estimates remain blank.",
        );
      });
    let appId = steamAppId;
    let steamFound = false;
    try {
      if (!appId) {
        const search = await json(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`,
        );
        const match = search.items?.find(
          (g: { name: string }) => g.name.toLowerCase() === title.toLowerCase(),
        );
        appId = match?.id?.toString();
      }
      if (appId) {
        const result = await json(
          `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=US`,
        );
        const game = result[appId];
        if (game?.success) {
          const g = game.data;
          steamFound = true;
          data.steamAppId = appId;
          data.title = g.name;
          // Use artwork returned by the provider, not a guessed asset URL.
          data.coverUrl = g.header_image || "";
          data.heroUrl = g.background_raw || g.background || g.header_image;
          data.gallery = (g.screenshots ?? []).map(
            (s: { path_full: string }) => s.path_full,
          );
          data.trailerUrl =
            g.movies?.[0]?.mp4?.max || g.movies?.[0]?.webm?.max || "";
          const date = Date.parse(g.release_date?.date);
          if (Number.isFinite(date))
            data.releaseDate = new Date(date).toISOString().slice(0, 10);
          sources.push("Steam");
        }
      }
    } catch {
      warnings.push(
        "Steam is unavailable or blocked. You can still save this game manually.",
      );
    }
    if (steamFound && appId) {
      if (process.env.STEAMGRIDDB_API_KEY) {
        await Promise.all(
          (["grids", "heroes", "logos"] as const).map(async (kind) => {
            try {
              const result = await json(
                `https://www.steamgriddb.com/api/v2/${kind}/steam/${appId}${kind === "grids" ? "?dimensions=600x900" : ""}`,
                {
                  headers: {
                    Authorization: `Bearer ${process.env.STEAMGRIDDB_API_KEY}`,
                  },
                },
              );
              const asset = result.data?.[0]?.url;
              if (asset) {
                data[
                  kind === "grids"
                    ? "coverUrl"
                    : kind === "heroes"
                      ? "heroUrl"
                      : "logoUrl"
                ] = asset;
                sources.push(`SteamGridDB ${kind}`);
              }
            } catch {
              warnings.push(`SteamGridDB ${kind} unavailable.`);
            }
          }),
        );
      } else
        warnings.push(
          "Optional SteamGridDB artwork needs STEAMGRIDDB_API_KEY.",
        );
    } else {
      if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
        try {
          const token = await json("https://id.twitch.tv/oauth2/token", {
            method: "POST",
            body: new URLSearchParams({
              client_id: process.env.TWITCH_CLIENT_ID,
              client_secret: process.env.TWITCH_CLIENT_SECRET,
              grant_type: "client_credentials",
            }),
          });
          const games = await json("https://api.igdb.com/v4/games", {
            method: "POST",
            headers: {
              "Client-ID": process.env.TWITCH_CLIENT_ID,
              Authorization: `Bearer ${token.access_token}`,
              "Content-Type": "text/plain",
            },
            body: `search ${JSON.stringify(title)}; fields name,cover.image_id,screenshots.image_id,first_release_date; limit 5;`,
          });
          const game = games.find(
            (g: { name: string }) =>
              g.name.toLowerCase() === title.toLowerCase(),
          );
          if (game) {
            const asset = (id: string, size: string) =>
              `https://images.igdb.com/igdb/image/upload/t_${size}/${id}.jpg`;
            data.title = game.name;
            if (game.cover)
              data.coverUrl = asset(game.cover.image_id, "cover_big");
            data.gallery = (game.screenshots ?? []).map(
              (s: { image_id: string }) => asset(s.image_id, "screenshot_big"),
            );
            data.heroUrl = data.gallery?.[0] || "";
            if (game.first_release_date)
              data.releaseDate = new Date(game.first_release_date * 1000)
                .toISOString()
                .slice(0, 10);
            sources.push("IGDB");
          } else
            warnings.push("No exact IGDB match. Try the official game title.");
        } catch {
          warnings.push(
            "IGDB is unavailable; check Twitch credentials and provider access.",
          );
        }
      } else
        warnings.push(
          "IGDB fallback needs TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.",
        );
    }
    await hltb;
    return NextResponse.json({ data, sources, warnings });
  } catch (e) {
    return apiError(e);
  }
}
