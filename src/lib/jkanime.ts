import * as cheerio from "cheerio";

const BASE_URL = "https://jkanime.net";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  Referer: BASE_URL + "/",
};

export interface EpisodeSource {
  server: string;
  url: string;
}

async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

export async function getEpisodeSourcesJK(
  animeSlug: string,
  episodeNumber: string | number,
): Promise<EpisodeSource[]> {
  const url = `${BASE_URL}/${animeSlug}/${episodeNumber}/`;
  let html: string;
  try {
    html = await fetchHTML(url);
  } catch {
    return [];
  }

  const $ = cheerio.load(html);
  const sources: EpisodeSource[] = [];

  // Extract inline video[] assignments (Desu, Magi etc JK players)
  $("script").each((_, el) => {
    const content = $(el).html() || "";
    // Match video[INDEX] = '<iframe ... >'
    const videoRegex = /video\[(\d+)\]\s*=\s*['"](<iframe[^'"]+>)['"]/g;
    let m;
    while ((m = videoRegex.exec(content)) !== null) {
      const idx = parseInt(m[1], 10);
      const iframeHtml = m[2];
      // Extract actual src from iframe string
      const srcMatch = iframeHtml.match(/src=["']([^"']+)["']/);
      if (srcMatch) {
        sources.push({
          server: `JK${idx === 0 ? " Desu" : idx === 1 ? " Magi" : ""}`.trim(),
          url: srcMatch[1],
        });
      }
    }

    // Also try to find the servers list (for additional download/stream links)
    // var servers = [ ... ] base64 remotes
    const serversMatch = content.match(/var servers\s*=\s*(\[[\s\S]*?\]);/);
    if (serversMatch) {
      try {
        const parsed = JSON.parse(serversMatch[1]);
        for (const s of parsed) {
          if (s.server && s.remote) {
            try {
              const decoded = Buffer.from(s.remote, "base64")
                .toString("utf8")
                .trim();
              if (decoded && decoded.startsWith("http")) {
                sources.push({ server: `JK ${s.server}`, url: decoded });
              }
            } catch {}
          }
        }
      } catch {}
    }
  });

  // Parse buttons for better server names if video not associated
  // The buttons are .bg-servers a or a.btn-show
  $(".bg-servers a, a.btn-show, a.servers").each((_, el) => {
    const $el = $(el);
    const name = $el.text().trim();
    const dataId = $el.attr("data-id");
    if (name && dataId) {
      // If we already have matching index we can rename, but simple append if not duplicate
      const existing = sources.findIndex((s) =>
        s.server.toLowerCase().includes(name.toLowerCase()),
      );
      if (existing === -1 && sources.length > 0) {
        // attempt match by index later; for now keep extracted
      }
    }
  });

  // Filter unique by url
  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    if (!s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  return unique;
}

export async function getAnimeDetailJK(slug: string): Promise<{
  title: string;
  synopsis: string;
  poster: string;
  status?: string;
  type?: string;
  lastEpisode?: number;
} | null> {
  const url = `${BASE_URL}/${slug}/`;
  let html: string;
  try {
    html = await fetchHTML(url);
  } catch {
    return null;
  }
  const $ = cheerio.load(html);

  const title = $("h1, .anime__details__title h3, title")
    .first()
    .text()
    .trim()
    .replace(" — JkAnime", "")
    .replace(/ - anime .*? online.*/i, "");
  const synopsis =
    $(".anime__details__text p, .sinopsis, p").first().text().trim() ||
    $(".card-body p").first().text().trim();

  let poster =
    $(
      "img.anime_pic, .anime__details__pic img, meta[property='og:image']",
    ).attr("src") || "";
  if (poster && !poster.startsWith("http")) poster = BASE_URL + poster;
  if (!poster) {
    // try og
    poster = $('meta[property="og:image"]').attr("content") || "";
  }

  const statusText = $(
    "*:contains('En emision'), *:contains('Concluido'), *:contains('Estado')",
  )
    .first()
    .text();
  const status = /emision/i.test(statusText)
    ? "En emisión"
    : /concluido/i.test(statusText)
      ? "Finalizado"
      : "";

  // Try to extract last episode number
  let lastEpisode: number | undefined;
  const lastLink = $("a[href*='/" + slug + "/']")
    .filter((_, el) => /\/\d+\/$/.test($(el).attr("href") || ""))
    .first()
    .attr("href");
  if (lastLink) {
    const numMatch = lastLink.match(/\/(\d+)\/$/);
    if (numMatch) lastEpisode = parseInt(numMatch[1], 10);
  }

  return { title, synopsis, poster, status, lastEpisode };
}

// For home: recent episodes from JK (used to reduce FLV dependency)
export async function getRecentEpisodesJK(): Promise<
  Array<{
    animeTitle: string;
    episodeNumber: string;
    poster: string;
    slug: string; // full ep slug like anime-123 for compat
    animeSlug: string;
  }>
> {
  try {
    const html = await fetchHTML(BASE_URL + "/");
    const $ = cheerio.load(html);
    const recents: any[] = [];

    // JK shows recent episodes with links like /slug/num/
    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const match = href.match(/^\/([a-z0-9-]+)\/(\d+)\/?$/);
      if (!match) return;
      const animeSlug = match[1];
      const epNum = match[2];

      // Try to get title from nearby text or img alt
      let title = $(el).text().trim();
      if (!title) title = $(el).find("img").attr("alt") || "";
      if (!title)
        title = $(el)
          .closest("li, article, div")
          .find("h5, h3, .title")
          .first()
          .text()
          .trim();

      const imgEl = $(el).find("img").first();
      let poster = imgEl.attr("src") || imgEl.attr("data-src") || "";
      if (poster && !poster.startsWith("http"))
        poster = "https:" + poster.replace(/^\/\//, "");

      // Skip if looks like non-episode (e.g. very long slug or navigation)
      if (animeSlug.length < 2 || /buscar|top|login|registro/i.test(animeSlug))
        return;

      recents.push({
        animeTitle: title || animeSlug.replace(/-/g, " "),
        episodeNumber: epNum,
        poster,
        slug: `${animeSlug}-${epNum}`,
        animeSlug,
      });
    });

    // Dedup + limit
    const seen = new Set<string>();
    const unique = recents.filter((r) => {
      if (seen.has(r.slug)) return false;
      seen.add(r.slug);
      return true;
    });

    return unique.slice(0, 60);
  } catch {
    return [];
  }
}

export async function searchAnimeJK(query: string) {
  try {
    const html = await fetchHTML(
      `${BASE_URL}/buscar/${encodeURIComponent(query)}/`,
    );
    const $ = cheerio.load(html);
    const results: any[] = [];

    // Better extraction focusing on main results
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/\/([a-z0-9-]{3,})\/?$/);
      if (!m) return;
      const slug = m[1];
      if (["buscar", "top", "login", "registro", "perfil"].includes(slug))
        return;
      let title = $(el).text().trim();
      if (!title || title.length < 2) return;
      if (
        /iniciar|sesion|registr|buscar|top|comentarios|historial/i.test(title)
      )
        return;

      results.push({
        id: slug,
        title: title.replace(/\s*—.*$/, "").trim(),
        poster: "",
        type: "Anime",
        slug,
      });
    });

    // unique
    const map = new Map();
    results.forEach((r) => map.set(r.slug, r));
    return Array.from(map.values()).slice(0, 30);
  } catch {
    return [];
  }
}
