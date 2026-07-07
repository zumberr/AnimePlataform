import * as cheerio from "cheerio";
import {
  getEpisodeSourcesJK,
  getRecentEpisodesJK,
  searchAnimeJK,
  getAnimeDetailJK,
} from "./jkanime";
import { getEpisodeSourcesFenix } from "./animefenix";
import {
  getRecentEpisodesTio,
  searchAnimeTio,
  getAnimeDetailTio,
  getEpisodeSourcesTio,
} from "./tioanime";

const BASE_URL = "https://www3.animeflv.net";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  Referer: BASE_URL + "/",
};

export interface AnimeCard {
  id: string;
  title: string;
  poster: string;
  type: string;
  slug: string;
}

export interface RecentEpisode {
  animeTitle: string;
  episodeNumber: string;
  poster: string;
  slug: string;
  animeSlug: string;
}

export interface AnimeDetail {
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
}

export interface EpisodeSource {
  server: string;
  url: string;
}

type AnimeDetailCandidate = Partial<AnimeDetail> & { lastEpisode?: number };

function isTioEpisodePageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    return (
      (hostname === "tioanime.com" || hostname.endsWith(".tioanime.com")) &&
      (pathname.startsWith("/ver/") || pathname.startsWith("/anime/"))
    );
  } catch {
    return false;
  }
}

function cleanText(value: string | undefined, maxLength = 1200): string {
  return (value || "")
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLength);
}

function isPollutedText(value: string | undefined): boolean {
  const text = (value || "").toLowerCase();
  return (
    text.length > 1800 ||
    text.includes("function(") ||
    text.includes("document.") ||
    text.includes("window.") ||
    text.includes("datalayer") ||
    text.includes("var ") ||
    text.includes("<script") ||
    text.includes("registro inicio") ||
    text.includes("programación semanal") ||
    text.includes("programacion semanal")
  );
}

function cleanGenres(genres: string[] | undefined): string[] {
  const seen = new Set<string>();
  return (genres || [])
    .map((genre) => cleanText(genre, 28))
    .filter((genre) => genre && !isPollutedText(genre))
    .filter((genre) => {
      const key = genre.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

// Deduplicate text that gets doubled from nested selectors
function dedup(text: string): string {
  if (text.length % 2 === 0) {
    const half = text.substring(0, text.length / 2);
    if (half === text.substring(text.length / 2)) return half;
  }
  return text;
}

async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

export async function getHomePageFLV(): Promise<{
  recent: RecentEpisode[];
  trending: AnimeCard[];
}> {
  const html = await fetchHTML(BASE_URL);
  const $ = cheerio.load(html);

  const recent: RecentEpisode[] = [];
  $(".ListEpisodios li").each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find("a.fa-play").first(); // Target the <a> with fa-play class directly
    const href = linkEl.attr("href") || "";
    const img = $el.find("img");
    const poster = img.attr("src") || "";
    const title = $el.find(".Title").text().trim();
    const ep = $el.find(".Capi").text().trim();

    const slugMatch = href.match(/\/ver\/(.+?)(?:\?|$)/);
    const slug = slugMatch ? slugMatch[1] : "";
    const animeSlug = slug.replace(/-\d+$/, "");

    recent.push({
      animeTitle: title,
      episodeNumber: ep.replace("Episodio ", ""),
      poster: poster.startsWith("http") ? poster : BASE_URL + poster,
      slug,
      animeSlug,
    });
  });

  const trending: AnimeCard[] = [];
  $(".ListAnimes .Anime").each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find("a").first();
    const href = linkEl.attr("href") || "";
    const img = $el.find("img");
    const poster = img.attr("src") || "";
    const title =
      $el.find(".Title").first().contents().first().text().trim() ||
      $el.find(".Title").first().text().trim();
    const type =
      $el.find(".Type").first().contents().first().text().trim() ||
      $el.find(".Type").first().text().trim();

    const slugMatch = href.match(/\/anime\/(.+)/);
    const slug = slugMatch ? slugMatch[1] : "";

    trending.push({
      id: slug,
      title: dedup(title),
      poster: poster.startsWith("http") ? poster : BASE_URL + poster,
      type: dedup(type),
      slug,
    });
  });

  return { recent, trending };
}

export async function searchAnimeFLV(query: string): Promise<AnimeCard[]> {
  const html = await fetchHTML(
    `${BASE_URL}/browse?q=${encodeURIComponent(query)}`,
  );
  const $ = cheerio.load(html);

  const results: AnimeCard[] = [];
  $(".ListAnimes .Anime").each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find("a").first();
    const href = linkEl.attr("href") || "";
    const img = $el.find("img");
    const poster = img.attr("src") || "";
    const title =
      $el.find(".Title").first().contents().first().text().trim() ||
      $el.find(".Title").first().text().trim();
    const type =
      $el.find(".Type").first().contents().first().text().trim() ||
      $el.find(".Type").first().text().trim();

    const slugMatch = href.match(/\/anime\/(.+)/);
    const slug = slugMatch ? slugMatch[1] : "";

    results.push({
      id: slug,
      title: dedup(title),
      poster: poster.startsWith("http") ? poster : BASE_URL + poster,
      type: dedup(type),
      slug,
    });
  });

  return results;
}

export async function getAnimeDetailFLV(slug: string): Promise<AnimeDetail> {
  const html = await fetchHTML(`${BASE_URL}/anime/${slug}`);
  const $ = cheerio.load(html);

  const title = $(".Ficha .Title").text().trim() || $("h1.Title").text().trim();
  const altTitle = $(".TitleAlt").text().trim();
  const synopsis = $(".Description p").text().trim();
  const posterImg = $(".AnimeCover img, .Image img").attr("src") || "";
  const poster = posterImg.startsWith("http")
    ? posterImg
    : BASE_URL + posterImg;
  const status =
    $(".Ficha .fa-tv").parent().text().trim() || $(".Type.A").text().trim();
  const type = $(".Ficha .Type").first().text().trim();
  const rating = $(".vtprmd").text().trim() || "";

  const genres: string[] = [];
  $(".Nvgs a, nav.Nvgs a").each((_, el) => {
    genres.push($(el).text().trim());
  });

  // Extract episodes from inline JS (more tolerant match)
  let episodes: { number: number; id: number }[] = [];
  $("script").each((_, el) => {
    const content = $(el).html() || "";
    if (/var episodes\s*=/.test(content)) {
      const match = content.match(/var episodes\s*=\s*(\[[\s\S]*?\]);/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          episodes = parsed.map((ep: [number, number]) => ({
            number: ep[0],
            id: ep[1],
          }));
        } catch {
          // fallback
        }
      }
    }
  });

  // Fallback: if no episodes from JS, try to find episode links on the page (for robustness)
  if (episodes.length === 0) {
    const foundEps = new Set<number>();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(new RegExp(`/ver/${slug}-(\\d+)`));
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > 0) foundEps.add(n);
      }
    });
    if (foundEps.size > 0) {
      episodes = Array.from(foundEps)
        .sort((a, b) => a - b)
        .map((n) => ({ number: n, id: n }));
    }
  }

  // Sort episodes ascending
  episodes.sort((a, b) => a.number - b.number);

  return {
    title,
    altTitle,
    synopsis,
    poster,
    status,
    type,
    genres,
    episodes,
    slug,
    rating,
  };
}

// Aggregated getAnimeDetail: TioAnime + JKAnime + Fenix first, FLV as fallback
// We also try to merge episode lists from multiple sources when available.
export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  const results = await Promise.allSettled([
    getAnimeDetailTio(slug),
    getAnimeDetailJK(slug),
    // We don't have a full getAnimeDetailFenix yet, skip for now
  ]);

  let best: AnimeDetailCandidate | null = null;
  for (const r of results) {
    if (
      r.status === "fulfilled" &&
      r.value &&
      r.value.title &&
      !isPollutedText(r.value.title) &&
      !isPollutedText(r.value.synopsis)
    ) {
      best = r.value;
      break; // Tio first, then JK
    }
  }

  // Try to get episodes from the sources that support it
  let episodes: { number: number; id: number }[] = [];

  // 1. If the best source already gave episodes, use them
  if (best && best.episodes && best.episodes.length > 0) {
    episodes = best.episodes;
  }

  // 2. Also try FLV (still good at full episode lists) + JK lastEp as supplement
  try {
    const flv = await getAnimeDetailFLV(slug).catch(() => null);
    if (flv && flv.episodes && flv.episodes.length > 0) {
      // Merge unique episode numbers
      const existing = new Set(episodes.map((e) => e.number));
      for (const ep of flv.episodes) {
        if (!existing.has(ep.number)) {
          episodes.push(ep);
          existing.add(ep.number);
        }
      }
      // Prefer FLV title/synopsis/poster if the Tio/JK one was poor
      if (
        !best ||
        !best.synopsis ||
        best.synopsis.length < 20 ||
        isPollutedText(best.synopsis)
      ) {
        best = { ...(best || {}), ...flv };
      }
    }
  } catch {}

  // If still no episodes, try to synthesize from JK lastEpisode
  if (episodes.length === 0) {
    try {
      const jk = await getAnimeDetailJK(slug);
      if (jk && jk.lastEpisode) {
        const last = Math.min(jk.lastEpisode, 500);
        episodes = Array.from({ length: last }, (_, i) => ({
          number: i + 1,
          id: i + 1,
        }));
      }
    } catch {}
  }

  episodes.sort((a, b) => a.number - b.number);

  if (best && best.title) {
    const title = cleanText(best.title, 120);
    const synopsis = isPollutedText(best.synopsis)
      ? ""
      : cleanText(best.synopsis, 900);
    return {
      title: title || slug.replace(/-/g, " "),
      altTitle: isPollutedText(best.altTitle)
        ? ""
        : cleanText(best.altTitle, 160),
      synopsis,
      poster: best.poster || "",
      status: isPollutedText(best.status) ? "" : cleanText(best.status, 40),
      type: isPollutedText(best.type) ? "" : cleanText(best.type, 40),
      genres: cleanGenres(best.genres),
      episodes,
      slug,
      rating: isPollutedText(best.rating) ? "" : cleanText(best.rating, 20),
    };
  }

  // Absolute last resort: FLV
  const flv = await getAnimeDetailFLV(slug);
  return {
    ...flv,
    title: cleanText(flv.title, 120) || slug.replace(/-/g, " "),
    altTitle: isPollutedText(flv.altTitle) ? "" : cleanText(flv.altTitle, 160),
    synopsis: isPollutedText(flv.synopsis) ? "" : cleanText(flv.synopsis, 900),
    status: isPollutedText(flv.status) ? "" : cleanText(flv.status, 40),
    type: isPollutedText(flv.type) ? "" : cleanText(flv.type, 40),
    genres: cleanGenres(flv.genres),
    rating: isPollutedText(flv.rating) ? "" : cleanText(flv.rating, 20),
  };
}

export async function getEpisodeSourcesFLV(slug: string): Promise<{
  sources: EpisodeSource[];
  animeSlug: string;
  episodeNumber: string;
  animeTitle: string;
}> {
  const html = await fetchHTML(`${BASE_URL}/ver/${slug}`);
  const $ = cheerio.load(html);

  let animeTitle = $(".CapiTnworget .Title, h1.Title").first().text().trim();
  // Clean common "Episodio X" suffix that appears appended to the anime name on episode pages
  animeTitle = animeTitle
    .replace(/\s*(Episodio|Capitulo|Episode)\s*\d+\s*$/i, "")
    .trim();
  if (!animeTitle) {
    animeTitle = $("h1.Title")
      .first()
      .text()
      .trim()
      .replace(/\s*(Episodio|Capitulo|Episode)\s*\d+\s*$/i, "")
      .trim();
  }

  const epMatch = slug.match(/-(\d+)$/);
  const episodeNumber = epMatch ? epMatch[1] : "1";
  const animeSlugMatch = slug.match(/^(.+)-\d+$/);
  const animeSlug = animeSlugMatch ? animeSlugMatch[1] : slug;

  // Known dead/unreachable video hosting domains
  const BLOCKED_DOMAINS = ["habetar.com"];

  function isBlockedUrl(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return BLOCKED_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      );
    } catch {
      return false;
    }
  }

  let sources: EpisodeSource[] = [];

  $("script").each((_, el) => {
    const content = $(el).html() || "";
    if (content.includes("var videos =")) {
      const match = content.match(/var videos = (\{.*?\});/s);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.SUB) {
            sources = parsed.SUB.map(
              (s: {
                server: string;
                title?: string;
                url?: string;
                code?: string;
              }) => ({
                server: s.title || s.server || "Unknown",
                url: s.url || s.code || "",
              }),
            );
          }
        } catch {
          // fallback
        }
      }
    }
  });

  // Also try to grab iframes directly
  if (sources.length === 0) {
    $(".CapiTnworget iframe, .player_conte iframe, iframe").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (src) {
        sources.push({ server: "Player", url: src });
      }
    });
  }

  // Filter out sources from blocked/dead domains
  sources = sources.filter(
    (s) => s.url && !isBlockedUrl(s.url) && !isTioEpisodePageUrl(s.url),
  );

  return { sources, animeSlug, episodeNumber, animeTitle };
}

// Combined multi-source episode servers (FLV + JKAnime + AnimeFenix)
export async function getEpisodeSources(slug: string): Promise<{
  sources: EpisodeSource[];
  animeSlug: string;
  episodeNumber: string;
  animeTitle: string;
}> {
  const flvData = await getEpisodeSourcesFLV(slug).catch(() => ({
    sources: [] as EpisodeSource[],
    animeSlug: "",
    episodeNumber: "",
    animeTitle: "",
  }));

  let animeSlug = flvData.animeSlug;
  let episodeNumber = flvData.episodeNumber;
  const animeTitle = flvData.animeTitle || slug;

  if (!animeSlug || !episodeNumber) {
    const epMatch = slug.match(/-(\d+)$/);
    episodeNumber = epMatch ? epMatch[1] : "1";
    const animeSlugMatch = slug.match(/^(.+)-\d+$/);
    animeSlug = animeSlugMatch ? animeSlugMatch[1] : slug;
  }

  // Generate common slug variants for Tio / JK / Fenix. Try the seasonless
  // base early; appending suffixes to an already season-qualified slug creates
  // bad URLs like "4th-season-tv".
  const seasonlessSlug = animeSlug
    .replace(/-\d+(?:st|nd|rd|th)-season$/i, "")
    .replace(/-season-\d+$/i, "");
  const variants = Array.from(
    new Set([
      animeSlug,
      seasonlessSlug,
      `${seasonlessSlug}-tv`,
      `${seasonlessSlug}-2nd-season`,
      `${seasonlessSlug}-season-2`,
      `${seasonlessSlug}-4th-season-2-nensei-hen-1-gakki`,
      `${seasonlessSlug}-3rd-season`,
      `${seasonlessSlug}-2-nensei-hen-1-gakki`,
    ]),
  )
    .filter(Boolean)
    .slice(0, 8);

  // Fetch sources using multiple variants (Tio + JK + Fenix prioritized)
  const variantPromises: Promise<EpisodeSource[]>[] = [];
  for (const v of variants) {
    variantPromises.push(
      getEpisodeSourcesTio(v, episodeNumber).catch(() => []),
    );
    variantPromises.push(getEpisodeSourcesJK(v, episodeNumber).catch(() => []));
    variantPromises.push(
      getEpisodeSourcesFenix(v, episodeNumber).catch(() => []),
    );
  }

  const variantResults = await Promise.all(variantPromises);

  // Merge and dedupe sources - Tio/JK/Fenix first, FLV last.
  // Full Tio episode pages are site pages, not players; never expose them.
  const all: EpisodeSource[] = [...variantResults.flat(), ...flvData.sources];
  const sourcePool = all.filter((s) => !isTioEpisodePageUrl(s.url));

  const seenUrls = new Set<string>();
  const merged: EpisodeSource[] = [];

  for (const s of sourcePool) {
    if (!s.url) continue;
    const normUrl = s.url.trim();
    const key = normUrl.toLowerCase();
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    let label = (s.server || "Server").trim();
    // Clean repeated words like "Tio Tio" or "TioAnime"
    label = label
      .replace(/(Tio\s*){2,}/gi, "Tio ")
      .replace(/TioAnime/gi, "Tio")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!label) label = "Server";
    merged.push({ server: label, url: normUrl });
  }

  // Blocked domains filter
  const BLOCKED_DOMAINS = ["habetar.com"];
  const filtered = merged.filter((s) => {
    try {
      const hostname = new URL(s.url).hostname.toLowerCase();
      return !BLOCKED_DOMAINS.some(
        (d) => hostname === d || hostname.endsWith(`.${d}`),
      );
    } catch {
      return true;
    }
  });

  // Final cleanup on title
  let cleanTitle = (animeTitle || animeSlug)
    .replace(/\s*(Episodio|Capitulo|Episode)\s*\d+\s*$/i, "")
    .trim();
  if (!cleanTitle) cleanTitle = animeSlug;

  return {
    sources: filtered,
    animeSlug,
    episodeNumber,
    animeTitle: cleanTitle,
  };
}

// --- Multi source wrappers to reduce single-source (FLV) dependency ---

export async function getHomePage(): Promise<{
  recent: RecentEpisode[];
  trending: AnimeCard[];
}> {
  const [tioRecent, jkRecent, flv] = await Promise.all([
    getRecentEpisodesTio().catch(() => [] as RecentEpisode[]),
    getRecentEpisodesJK().catch(() => [] as RecentEpisode[]),
    getHomePageFLV().catch(() => ({
      recent: [] as RecentEpisode[],
      trending: [] as AnimeCard[],
    })),
  ]);

  // Prioritize TioAnime + JKAnime heavily (much less dependence on AnimeFLV)
  const recentMap = new Map<string, RecentEpisode>();
  for (const r of tioRecent) {
    if (r.slug && !recentMap.has(r.slug))
      recentMap.set(r.slug, r as RecentEpisode);
  }
  for (const r of jkRecent) {
    if (r.slug && !recentMap.has(r.slug))
      recentMap.set(r.slug, r as RecentEpisode);
  }
  // FLV as fallback only
  for (const r of flv.recent) {
    if (r.slug && !recentMap.has(r.slug))
      recentMap.set(r.slug, r as RecentEpisode);
  }

  const finalRecent = Array.from(recentMap.values())
    .slice(0, 60)
    .map((r) => ({
      ...r,
      animeTitle: r.animeTitle.replace(/\s*\d+\s*$/, "").trim() || r.animeTitle,
    }));

  return {
    recent: finalRecent,
    trending: flv.trending.length ? flv.trending : [],
  };
}

export async function searchAnime(query: string): Promise<AnimeCard[]> {
  const [tio, jk, flv] = await Promise.all([
    searchAnimeTio(query).catch(() => []),
    searchAnimeJK(query).catch(() => []),
    searchAnimeFLV(query).catch(() => []),
  ]);
  const map = new Map<string, AnimeCard>();
  // Tio + JK first, FLV as fallback
  [...tio, ...jk, ...flv].forEach((a) => {
    if (a.slug && !map.has(a.slug)) map.set(a.slug, a);
  });
  return Array.from(map.values());
}
