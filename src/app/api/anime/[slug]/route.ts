import { NextRequest, NextResponse } from "next/server";
import { getAnimeDetail } from "@/lib/animeflv";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const data = await getAnimeDetail(slug);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Anime detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch anime detail" },
      { status: 500 }
    );
  }
}
