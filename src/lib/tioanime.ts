import * as cheerio from "cheerio";

const BASE_URL = "https://tioanime.com";

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

interface RecentEpisodeTio {
  animeTitle: string;
  episodeNumber: string;
  poster: string;
  slug: string;
  animeSlug: string;
}

interface SearchResultTio {
  id: string;
  title: string;
  poster: string;
  type: string;
  slug: string;
}

function normalizePlayerUrl(value: string): string {
  let url = value
    .trim()
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");
  if (url.startsWith("//")) url = `https:${url}`;
  return url;
}

function isUsablePlayerUrl(url: string): boolean {
  if (!/^https?:\/\//.test(url)) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host === "tioanime.com" && (path.startsWith("/ver/") || path.startsWith("/anime/"))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function labelFromUrl(url: string, fallback = "Player") {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("dood")) return "Dood";
    if (host.includes("sb")) return "StreamSB";
    if (host.includes("fembed") || host.includes("fplayer")) return "Fembed";
    if (host.includes("mega")) return "Mega";
    if (host.includes("streamtape")) return "Streamtape";
    if (host.includes("voe")) return "Voe";
    if (host.includes("yourupload")) return "YourUpload";
    if (host.includes("vid")) return "Vid";
    const name = host.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return fallback;
  }
}

async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

export async function getRecentEpisodesTio(): Promise<
  RecentEpisodeTio[]
> {
  try {
    const html = await fetchHTML(BASE_URL + "/");
    const $ = cheerio.load(html);
    const recents: RecentEpisodeTio[] = [];

    $("a[href^='/ver/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const match = href.match(/\/ver\/([a-z0-9-]+)-(\d+)/i);
      if (!match) return;

      const animeSlug = match[1];
      const epNum = match[2];

      let title = $(el).attr("title") || $(el).text().trim();
      if (!title) {
        title = $(el)
          .closest("article, .episode, li, div")
          .find("h3, h2, .title")
          .first()
          .text()
          .trim();
      }

      const img =
        $(el).find("img").attr("src") ||
        $(el).closest("article, .episode").find("img").attr("src") ||
        "";
      let poster = img || "";
      if (poster && !poster.startsWith("http")) {
        poster = poster.startsWith("//")
          ? "https:" + poster
          : BASE_URL + poster;
      }

      recents.push({
        animeTitle: title || animeSlug.replace(/-/g, " "),
        episodeNumber: epNum,
        poster,
        slug: `${animeSlug}-${epNum}`,
        animeSlug,
      });
    });

    // Dedup
    const seen = new Set<string>();
    return recents
      .filter((r) => {
        if (seen.has(r.slug)) return false;
        seen.add(r.slug);
        return true;
      })
      .slice(0, 60);
  } catch {
    return [];
  }
}

export async function searchAnimeTio(query: string) {
  try {
    // Tio uses /directorio - we fetch and filter client-side for simplicity
    const html = await fetchHTML(`${BASE_URL}/directorio`);
    const $ = cheerio.load(html);
    const q = query.toLowerCase();
    const results: SearchResultTio[] = [];

    $("a[href^='/anime/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/\/anime\/([a-z0-9-]+)/i);
      if (!m) return;
      const slug = m[1];

      let title = $(el).attr("title") || $(el).text().trim();
      if (!title)
        title = $(el)
          .closest("article, .anime")
          .find("h3, h2")
          .first()
          .text()
          .trim();

      if (!title || !title.toLowerCase().includes(q)) return;

      const img =
        $(el).find("img").attr("src") ||
        $(el).closest("article").find("img").attr("src") ||
        "";
      let poster = img;
      if (poster && !poster.startsWith("http")) {
        poster = poster.startsWith("//")
          ? "https:" + poster
          : BASE_URL + poster;
      }

      results.push({
        id: slug,
        title,
        poster,
        type: "Anime",
        slug,
      });
    });

    const map = new Map();
    results.forEach((r) => {
      if (!map.has(r.slug)) map.set(r.slug, r);
    });
    return Array.from(map.values()).slice(0, 30);
  } catch {
    return [];
  }
}

export async function getAnimeDetailTio(slug: string): Promise<{
  title: string;
  altTitle: string;
  synopsis: string;
  poster: string;
  status: string;
  type: string;
  genres: string[];
  episodes: { number: number; id: number }[];
  slug: string;
  rating: string;
} | null> {
  // Try common slug variants used on Tio
  const variants = [
    slug,
    `${slug}-tv`,
    slug.replace(/-4th-season$/, ""),
    slug.replace(/-season-\d+$/, ""),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  let html: string | null = null;
  let usedSlug = slug;

  for (const v of variants) {
    try {
      html = await fetchHTML(`${BASE_URL}/anime/${v}`);
      usedSlug = v;
      break;
    } catch {
      // try next variant
    }
  }

  if (!html) return null;

  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, form").remove();

  const title =
    $("h1").first().text().trim() ||
    $("meta[property='og:title']").attr("content") ||
    $("title").text().split("-")[0].trim();

  let synopsis = $(
    ".sinopsis, .synopsis, .description, .descripcion, [class*='sinopsis'], [class*='description']",
  )
    .first()
    .text()
    .trim();
  if (!synopsis) {
    synopsis = $("meta[name='description']").attr("content") || "";
  }

  let poster = $("meta[property='og:image']").attr("content") || "";
  if (!poster) {
    poster =
      $(
        ".anime img, .portada img, .poster img, .thumb img, .imagen img, main img",
      )
        .first()
        .attr("src") || "";
  }
  if (poster && !poster.startsWith("http")) {
    poster = poster.startsWith("//") ? "https:" + poster : BASE_URL + poster;
  }

  const pageText = $("main, body").text().toLowerCase();
  const status =
    pageText.includes("en emision") || pageText.includes("en emisión")
      ? "En emision"
      : pageText.includes("finalizado") || pageText.includes("concluido")
        ? "Finalizado"
        : "";

  const type = /\bova\b/i.test(pageText)
    ? "OVA"
    : /\bona\b/i.test(pageText)
      ? "ONA"
      : /pelicula|película|movie/i.test(pageText)
        ? "Pelicula"
        : /\btv\b/i.test(pageText)
          ? "TV"
          : "Anime";

  const genres: string[] = [];
  $("a[href*='/genero/'], .genres a, .genero a").each((_, el) => {
    const g = $(el).text().trim();
    if (g && g.length < 30) genres.push(g);
  });

  // Episodes: Tio loads them dynamically. We try to extract latest number from page or links.
  const episodes: { number: number; id: number }[] = [];

  // Try finding any episode links in page
  $("a[href*='/ver/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/-(\d+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > 0 && !episodes.find((e) => e.number === num)) {
        episodes.push({ number: num, id: num });
      }
    }
  });

  // If we found some, sort
  if (episodes.length > 0) {
    episodes.sort((a, b) => a.number - b.number);
  } else {
    // As a last resort, we can leave empty. The multi-source will try other providers.
  }

  return {
    title,
    altTitle: "",
    synopsis: synopsis || "",
    poster: poster || "",
    status,
    type,
    genres: genres.slice(0, 10),
    episodes,
    slug: usedSlug,
    rating: "",
  };
}

export async function getEpisodeSourcesTio(
  animeSlug: string,
  episodeNumber: string | number,
): Promise<EpisodeSource[]> {
  const sources: EpisodeSource[] = [];
  const num = episodeNumber;

  // Limit variants aggressively to prevent duplicates. Try the seasonless base
  // before suffix variants to avoid URLs like "4th-season-tv".
  const seasonlessSlug = animeSlug
    .replace(/-\d+(?:st|nd|rd|th)-season$/i, "")
    .replace(/-season-\d+$/i, "");
  const variants = [
    animeSlug,
    seasonlessSlug,
    `${seasonlessSlug}-tv`,
    `${seasonlessSlug}-2nd-season`,
    `${seasonlessSlug}-season-2`,
    `${seasonlessSlug}-4th-season-2-nensei-hen-1-gakki`,
    `${seasonlessSlug}-3rd-season`,
    `${seasonlessSlug}-2-nensei-hen-1-gakki`,
  ]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 8); // max 8 attempts

  let fetched = false;

  for (const v of variants) {
    if (fetched) break;
    const epSlug = `${v}-${num}`;
    const pageUrl = `${BASE_URL}/ver/${epSlug}`;

    try {
      const html = await fetchHTML(pageUrl);
      const $ = cheerio.load(html);

      const foundUrls = new Set<string>();

      // 1. Direct iframes (the real player embeds, not the wrapper)
      $("iframe[src]").each((_, el) => {
        const src = normalizePlayerUrl($(el).attr("src") || "");
        if (!src) return;
        // Skip self-referential tio pages and obvious non-players
        if (!isUsablePlayerUrl(src)) return;
        if (foundUrls.has(src)) return;
        foundUrls.add(src);
        const serverName = labelFromUrl(src, "Tio");
        sources.push({ server: `Tio ${serverName}`, url: src });
      });

      // 2. Script-injected video sources (common pattern)
      $("script").each((_, el) => {
        const txt = ($(el).html() || "").replace(/\\\//g, "/");

        const videosMatch = txt.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
        if (videosMatch) {
          try {
            const parsed = JSON.parse(videosMatch[1]);
            if (Array.isArray(parsed)) {
              parsed.forEach((entry) => {
                if (!Array.isArray(entry)) return;
                const name = String(entry[0] || "Player").trim();
                const u = normalizePlayerUrl(String(entry[1] || ""));
                if (!isUsablePlayerUrl(u) || foundUrls.has(u)) return;
                foundUrls.add(u);
                sources.push({
                  server: `Tio ${name || labelFromUrl(u)}`,
                  url: u,
                });
              });
            }
          } catch {}
        }

        // Look for direct video/embed urls in js
        const urlRegex =
          /https?:\/\/[^\s"'<>`]+?(?:embed|player|video|dood|stream|sb|mega|fembed|vid)[^\s"'<>`]*/gi;
        let m;
        while ((m = urlRegex.exec(txt)) !== null) {
          let u = normalizePlayerUrl(m[0]);
          if (u.endsWith('"') || u.endsWith("'")) u = u.slice(0, -1);
          if (!isUsablePlayerUrl(u)) continue;
          if (foundUrls.has(u)) continue;
          foundUrls.add(u);
          const serverName = labelFromUrl(u);
          sources.push({ server: `Tio ${serverName}`, url: u });
        }

        // Look for common video object or array
        const videoObj = txt.match(/videos?\s*[:=]\s*(\{[\s\S]{0,600}?\})/i);
        if (videoObj) {
          try {
            // very loose, extract any http urls inside
            const innerUrls = videoObj[1].match(/https?:\/\/[^"'\s,]+/g) || [];
            innerUrls.forEach((u) => {
              const normalized = normalizePlayerUrl(u);
              if (isUsablePlayerUrl(normalized) && !foundUrls.has(normalized)) {
                foundUrls.add(normalized);
                sources.push({
                  server: `Tio ${labelFromUrl(normalized)}`,
                  url: normalized,
                });
              }
            });
          } catch {}
        }
      });

      // 3. Data attributes on server / mirror buttons (common on these sites)
      $(
        "[data-src], [data-url], [data-player], [data-embed], [data-link]",
      ).each((_, el) => {
        const $el = $(el);
        let data =
          $el.attr("data-src") ||
          $el.attr("data-url") ||
          $el.attr("data-player") ||
          $el.attr("data-embed") ||
          $el.attr("data-link") ||
          "";
        data = normalizePlayerUrl(data);
        if (!isUsablePlayerUrl(data)) return;
        if (foundUrls.has(data)) return;
        foundUrls.add(data);
        const name = ($el.text().trim() || $el.attr("title") || "Server").slice(
          0,
          20,
        );
        sources.push({
          server: name.includes("Tio") ? name : `Tio ${name}`,
          url: data,
        });
      });

      // 4. Anchor links to known player domains inside player area
      $("#video, .player, .video-player, .embed, .reproductor, .cap")
        .find("a[href]")
        .each((_, el) => {
          const href = $(el).attr("href") || "";
          const normalized = normalizePlayerUrl(href);
          if (
            isUsablePlayerUrl(normalized) &&
            (normalized.includes("embed") || normalized.includes("player"))
          ) {
            if (!foundUrls.has(normalized)) {
              foundUrls.add(normalized);
              sources.push({
                server: `Tio ${labelFromUrl(normalized)}`,
                url: normalized,
              });
            }
          }
        });

      if (sources.length > 0) {
        fetched = true;
      }
    } catch {
      // try next variant
    }
  }

  // Final aggressive dedup + sanitize server labels
  const seen = new Set<string>();
  const cleaned = sources
    .filter((s) => s.url && s.url.length > 8)
    .map((s) => {
      let label = (s.server || "Tio").trim();
      // Remove repetitive words
      label = label
        .replace(/(Tio\s*){2,}/gi, "Tio ")
        .replace(/TioAnime/gi, "Tio");
      label = label.replace(/\s+/g, " ").trim();
      if (!label || label.toLowerCase() === "tio") label = "Tio";
      return { server: label, url: s.url.trim() };
    })
    .filter((s) => {
      const k = s.url.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8); // never more than 8 sources per episode

  return cleaned;
}
