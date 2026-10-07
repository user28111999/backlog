import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "P2025"
  )
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  console.error("Database operation failed");
  return NextResponse.json(
    { error: "Unable to complete the database operation" },
    { status: 500 },
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  try {
    return (
      !origin ||
      origin === new URL(request.url).origin ||
      new URL(origin).host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
