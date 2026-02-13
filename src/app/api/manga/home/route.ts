import { NextResponse } from "next/server";
import { getPopularManga, getNewChapters } from "@/lib/ikigai";

export async function GET() {
  try {
    const [popular, recent] = await Promise.all([
      getPopularManga(1),
      getNewChapters(1),
    ]);

    return NextResponse.json({
      popular: popular.data.slice(0, 12),
      recent: recent.data.slice(0, 15),
    });
  } catch (error) {
    console.error("Manga home error:", error);
    return NextResponse.json(
      { error: "Error al cargar mangas" },
      { status: 500 }
    );
  }
}
