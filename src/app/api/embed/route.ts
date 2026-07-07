import { NextRequest, NextResponse } from "next/server";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isTioEpisodePage(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.replace(/^www\./, "") === "tioanime.com" &&
      parsed.pathname.startsWith("/ver/")
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const safeUrl = escapeHtml(url);
  const tioPage = isTioEpisodePage(url);
  const html = tioPage
    ? `<!DOCTYPE html>
<html><head>
<meta name="referrer" content="no-referrer">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
.stage{position:fixed;inset:0;overflow:hidden;background:#000}
iframe{
  position:absolute;
  top:0;
  left:0;
  width:100%;
  height:1100px;
  border:0;
  background:#000;
  transform-origin:top left;
  transform:translate(-22px,-258px) scale(1.43);
}
@media (max-width: 700px){
  iframe{transform:translate(-14px,-214px) scale(1.3);height:900px}
}
</style>
</head><body>
<div class="stage">
  <iframe src="${safeUrl}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe>
</div>
</body></html>`
    : `<!DOCTYPE html>
<html><head>
<meta name="referrer" content="no-referrer">
<style>*{margin:0;padding:0;overflow:hidden;background:#000}iframe{width:100%;height:100vh;border:none}</style>
</head><body>
<iframe src="${safeUrl}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
