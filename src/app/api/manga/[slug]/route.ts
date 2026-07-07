import { NextRequest, NextResponse } from "next/server";
import { getMangaDetail } from "@/lib/ikigai";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const data = await getMangaDetail(slug);
    return NextResponse.json(data);
  } catch (error) {
    console.warn("Manga detail error (Ikigai API):", error);
    return NextResponse.json(
      { series: null, similar_series: null },
      { status: 200 },
    );
  }
}
