import { NextRequest, NextResponse } from "next/server";
import { getAllSeries } from "@/lib/ikigai";

export async function GET(req: NextRequest) {
  try {
    const page = Number(req.nextUrl.searchParams.get("page") || "1");
    const data = await getAllSeries(page, 18);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn("Manga list error (Ikigai API down):", message);
    // Return empty page so UI doesn't break while Ikigai backend is unstable
    return NextResponse.json({
      data: [],
      current_page: page,
      last_page: 1,
      total: 0,
      per_page: 18,
    });
  }
}
