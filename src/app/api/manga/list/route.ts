import { NextRequest, NextResponse } from "next/server";
import { getAllSeries } from "@/lib/ikigai";

export async function GET(req: NextRequest) {
  try {
    const page = Number(req.nextUrl.searchParams.get("page") || "1");
    const data = await getAllSeries(page, 18);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Manga list error:", message);
    return NextResponse.json(
      { error: `Error al cargar la lista de mangas: ${message}` },
      { status: 502 }
    );
  }
}
