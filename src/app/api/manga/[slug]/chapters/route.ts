import { NextRequest, NextResponse } from "next/server";
import { getMangaChapters } from "@/lib/ikigai";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = Number(req.nextUrl.searchParams.get("page") || "1");
    const data = await getMangaChapters(slug, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Manga chapters error:", error);
    return NextResponse.json(
      { error: "Error al cargar capitulos" },
      { status: 500 }
    );
  }
}
