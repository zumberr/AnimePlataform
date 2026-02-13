import { NextRequest, NextResponse } from "next/server";
import { getEpisodeSources } from "@/lib/animeflv";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const data = await getEpisodeSources(slug);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Episode sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch episode sources" },
      { status: 500 }
    );
  }
}
