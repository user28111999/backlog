import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gameSchema } from "@/lib/game";
import { apiError, sameOrigin } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(
      await db.game.findMany({ orderBy: { title: "asc" } }),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    return NextResponse.json(
      await db.game.create({ data: gameSchema.parse(await req.json()) }),
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
