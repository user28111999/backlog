import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { fetchSteamScreenshots, screenshotPage } from "@/lib/steam-screenshots";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const game = await db.game.findUnique({
    where: { id: (await context.params).id },
  });
  if (!game)
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (!game.steamAppId)
    return NextResponse.json(
      { error: "Add a Steam App ID first." },
      { status: 400 },
    );
  const sourceUrl = screenshotPage(game.steamAppId);
  try {
    const screenshots = await fetchSteamScreenshots(game.steamAppId);
    if (!screenshots.length)
      return NextResponse.json({
        added: 0,
        sourceUrl,
        message:
          "No public screenshots were found for this game on windowpeeper’s profile.",
      });
    const existing = Array.isArray(game.gallery)
      ? game.gallery.filter((url): url is string => typeof url === "string")
      : [];
    const gallery = [...new Set([...existing, ...screenshots])].slice(0, 100);
    await db.game.update({ where: { id: game.id }, data: { gallery } });
    return NextResponse.json({
      added: gallery.length - existing.length,
      sourceUrl,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Steam Community is unavailable. Your existing screenshots have been kept.",
        sourceUrl,
      },
      { status: 502 },
    );
  }
}
