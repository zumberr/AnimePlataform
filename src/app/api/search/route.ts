import { NextRequest, NextResponse } from "next/server";
import { searchAnime } from "@/lib/animeflv";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }
  try {
    const results = await searchAnime(q);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search anime" },
      { status: 500 }
    );
  }
}
