import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Serve a minimal HTML page that loads the player directly
  const html = `<!DOCTYPE html>
<html><head>
<meta name="referrer" content="no-referrer">
<style>*{margin:0;padding:0;overflow:hidden;background:#000}iframe{width:100%;height:100vh;border:none}</style>
</head><body>
<iframe src="${url}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
