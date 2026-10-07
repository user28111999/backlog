import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emptyTimes, fetchHltb, HltbProviderError } from "@/lib/hltb";
import { apiError, sameOrigin } from "@/lib/http";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const game = await db.game.findUnique({
      where: { id: (await context.params).id },
    });
    if (!game)
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    if (
      game.hltbFetchedAt &&
      Date.now() - game.hltbFetchedAt.getTime() < 86400000
    )
      return NextResponse.json({ game });
    const times = await fetchHltb(game.title, game.hltbId || undefined);
    const updated = await db.game.update({
      where: { id: game.id },
      data: { ...(times || emptyTimes), hltbFetchedAt: new Date() },
    });
    return NextResponse.json({ game: updated });
  } catch (error) {
    if (error instanceof HltbProviderError)
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 502 },
      );
    return apiError(error);
  }
}
