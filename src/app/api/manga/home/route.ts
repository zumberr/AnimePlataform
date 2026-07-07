import { NextResponse } from "next/server";
import { getPopularManga, getNewChapters } from "@/lib/ikigai";

export async function GET() {
  try {
    const results = await Promise.allSettled([
      getPopularManga(1).catch(() => ({ data: [] as any[] })),
      getNewChapters(1).catch(() => ({ data: [] as any[] })),
    ]);

    const popular =
      results[0].status === "fulfilled" ? results[0].value : { data: [] };
    const recent =
      results[1].status === "fulfilled" ? results[1].value : { data: [] };

    return NextResponse.json({
      popular: (popular.data || []).slice(0, 12),
      recent: (recent.data || []).slice(0, 15),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn("Manga home partial error:", message);
    return NextResponse.json({ popular: [], recent: [] });
  }
}
