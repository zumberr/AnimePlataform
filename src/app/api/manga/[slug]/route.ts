import { NextRequest, NextResponse } from "next/server";
import { getMangaDetail } from "@/lib/ikigai";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const data = await getMangaDetail(slug);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Manga detail error:", error);
    return NextResponse.json(
      { error: "Error al cargar manga" },
      { status: 500 }
    );
  }
}
