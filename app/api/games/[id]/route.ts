import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gameSchema } from "@/lib/game";
import { apiError, sameOrigin } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, c: Context) {
  try {
    const game = await db.game.findUnique({
      where: { id: (await c.params).id },
    });
    return NextResponse.json(game ?? { error: "Game not found" }, {
      status: game ? 200 : 404,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: Request, c: Context) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const input = await req.json();
    const parsed = gameSchema.partial().parse(input);
    // PATCH must not apply create-time defaults to omitted fields.
    const data = Object.fromEntries(
      Object.entries(parsed).filter(([key]) => Object.hasOwn(input, key)),
    );
    return NextResponse.json(
      await db.game.update({
        where: { id: (await c.params).id },
        data,
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(req: Request, c: Context) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    await db.game.delete({ where: { id: (await c.params).id } });
    return new Response(null, { status: 204 });
  } catch (e) {
    return apiError(e);
  }
}
