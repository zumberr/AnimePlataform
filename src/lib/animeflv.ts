import * as cheerio from "cheerio";

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

export async function getHomePage(): Promise<{
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
        const title = $el.find(".Title").first().contents().first().text().trim() || $el.find(".Title").first().text().trim();
        const type = $el.find(".Type").first().contents().first().text().trim() || $el.find(".Type").first().text().trim();

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

export async function searchAnime(query: string): Promise<AnimeCard[]> {
    const html = await fetchHTML(`${BASE_URL}/browse?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(html);

    const results: AnimeCard[] = [];
    $(".ListAnimes .Anime").each((_, el) => {
        const $el = $(el);
        const linkEl = $el.find("a").first();
        const href = linkEl.attr("href") || "";
        const img = $el.find("img");
        const poster = img.attr("src") || "";
        const title = $el.find(".Title").first().contents().first().text().trim() || $el.find(".Title").first().text().trim();
        const type = $el.find(".Type").first().contents().first().text().trim() || $el.find(".Type").first().text().trim();

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

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
    const html = await fetchHTML(`${BASE_URL}/anime/${slug}`);
    const $ = cheerio.load(html);

    const title = $(".Ficha .Title").text().trim() || $("h1.Title").text().trim();
    const altTitle = $(".TitleAlt").text().trim();
    const synopsis = $(".Description p").text().trim();
    const posterImg = $(".AnimeCover img, .Image img").attr("src") || "";
    const poster = posterImg.startsWith("http") ? posterImg : BASE_URL + posterImg;
    const status = $(".Ficha .fa-tv").parent().text().trim() || $(".Type.A").text().trim();
    const type = $(".Ficha .Type").first().text().trim();
    const rating = $(".vtprmd").text().trim() || "";

    const genres: string[] = [];
    $(".Nvgs a, nav.Nvgs a").each((_, el) => {
        genres.push($(el).text().trim());
    });

    // Extract episodes from inline JS
    let episodes: { number: number; id: number }[] = [];
    $("script").each((_, el) => {
        const content = $(el).html() || "";
        if (content.includes("var episodes =")) {
            const match = content.match(/var episodes = (\[.*?\]);/s);
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

export async function getEpisodeSources(slug: string): Promise<{
    sources: EpisodeSource[];
    animeSlug: string;
    episodeNumber: string;
    animeTitle: string;
}> {
    const html = await fetchHTML(`${BASE_URL}/ver/${slug}`);
    const $ = cheerio.load(html);

    const animeTitle = $(".CapiTnworget .Title, h1.Title").text().trim();
    const epMatch = slug.match(/-(\d+)$/);
    const episodeNumber = epMatch ? epMatch[1] : "1";
    const animeSlugMatch = slug.match(/^(.+)-\d+$/);
    const animeSlug = animeSlugMatch ? animeSlugMatch[1] : slug;

    // Known dead/unreachable video hosting domains
    const BLOCKED_DOMAINS = [
        "habetar.com",
    ];

    function isBlockedUrl(url: string): boolean {
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            return BLOCKED_DOMAINS.some(
                (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
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
                            (s: { server: string; title?: string; url?: string; code?: string }) => ({
                                server: s.title || s.server || "Unknown",
                                url: s.url || s.code || "",
                            })
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
    sources = sources.filter((s) => s.url && !isBlockedUrl(s.url));

    return { sources, animeSlug, episodeNumber, animeTitle };
}
