import { NextRequest, NextResponse } from "next/server";
import { getMangaChapters } from "@/lib/ikigai";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const page = Number(req.nextUrl.searchParams.get("page") || "1");
    const data = await getMangaChapters(slug, page);
    return NextResponse.json(data);
  } catch (error) {
    console.warn("Manga chapters error (Ikigai API):", error);
    return NextResponse.json(
      { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
      { status: 200 },
    );
  }
}
