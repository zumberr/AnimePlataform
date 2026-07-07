import * as cheerio from "cheerio";

const BASE_URL = "https://animefenix.com.co";

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

export async function getEpisodeSourcesFenix(animeSlug: string, episodeNumber: string | number): Promise<EpisodeSource[]> {
  // Try common patterns
  const patterns = [
    `${animeSlug}-episode-${episodeNumber}-sub-espanol`,
    `${animeSlug}-capitulo-${episodeNumber}-sub-espanol`,
    `${animeSlug}-episodio-${episodeNumber}`,
  ];

  for (const p of patterns) {
    const url = `${BASE_URL}/${p}/`;
    try {
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);
      const sources: EpisodeSource[] = [];

      // Extract from mirror select options (base64 encoded iframes)
      $("select.mirror option, select[name='mirror'] option, option").each((_, el) => {
        const $el = $(el);
        const val = $el.attr("value") || "";
        const name = $el.text().trim();
        if (!val || !name || name.toLowerCase().includes("select")) return;

        // If value is base64 encoded html/iframe
        if (/^[A-Za-z0-9+/=]+$/.test(val) && val.length > 40) {
          try {
            const decoded = Buffer.from(val, "base64").toString("utf8");
            const srcMatch = decoded.match(/src=["']([^"']+)["']/i);
            if (srcMatch) {
              sources.push({ server: `Fenix ${name}`, url: srcMatch[1] });
            } else if (decoded.includes("http")) {
              // maybe direct url
              const httpMatch = decoded.match(/https?:\/\/[^\s"'<>]+/);
              if (httpMatch) sources.push({ server: `Fenix ${name}`, url: httpMatch[0] });
            }
          } catch {}
        } else if (val.startsWith("http") || val.includes("iframe")) {
          const srcMatch = val.match(/src=["']?([^"'\s>]+)/i) || val.match(/^(https?:\/\/.+)/);
          if (srcMatch) sources.push({ server: `Fenix ${name}`, url: srcMatch[1] });
        }
      });

      // Direct iframe on page (default player)
      $("iframe[src]").each((_, el) => {
        const src = $(el).attr("src") || "";
        if (src && /animehi|vid\.|player|embed/i.test(src)) {
          if (!sources.some((s) => s.url === src)) {
            sources.push({ server: "Fenix Stream", url: src });
          }
        }
      });

      // Look for data-video or ajax triggers that may reveal
      $('[data-video], [data-embed], [data-hash]').each((_, el) => {
        const hash = $(el).attr("data-video") || $(el).attr("data-embed") || $(el).attr("data-hash");
        if (hash) {
          // The site uses ajax to load, but we can expose a placeholder or known pattern
          // We already get the default from iframe
        }
      });

      if (sources.length > 0) return sources;
    } catch {
      // try next pattern
    }
  }
  return [];
}
