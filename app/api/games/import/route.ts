import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/http";
import { importGames } from "@/lib/import-games";

export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(req.headers.get("content-length") || 0) > 2_000_000)
    return NextResponse.json(
      { error: "CSV must be smaller than 2 MB." },
      { status: 413 },
    );
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 2_000_000)
      return NextResponse.json(
        { error: "Choose a CSV smaller than 2 MB." },
        { status: 400 },
      );
    return NextResponse.json(await importGames(await file.text()));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CSV import failed." },
      { status: 400 },
    );
  }
}
