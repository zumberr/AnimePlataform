import { NextRequest, NextResponse } from "next/server";
import { getEpisodeSources } from "@/lib/animeflv";

function isNonPlayerPageUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const tioPage =
      host === "tioanime.com" &&
      (path.startsWith("/ver/") || path.startsWith("/anime/"));
    const mediafireDownload =
      host === "mediafire.com" && path.startsWith("/file/");
    return tioPage || mediafireDownload;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const data = await getEpisodeSources(slug);
    return NextResponse.json({
      ...data,
      sources: data.sources.filter((source) => !isNonPlayerPageUrl(source.url)),
    });
  } catch (error) {
    console.error("Episode sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch episode sources" },
      { status: 500 },
    );
  }
}
