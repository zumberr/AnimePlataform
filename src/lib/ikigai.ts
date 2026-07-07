const LEGACY_API_BASE = "https://panel.ikigaimangas.com/api/swf";
const API_BASE = "https://api.ikigaicomics.lat/api";
const SITE_BASE = "https://ikigaicomics.lat";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: `${SITE_BASE}/`,
  Origin: SITE_BASE,
  Cookie: "nsfw-mode=false; ikigai-adult=on",
};

const FETCH_TIMEOUT = 10000;
const SEARCH_PAGE_SIZE = 15;

export interface MangaSeries {
  id: string;
  name: string;
  slug: string;
  cover: string;
  type: string;
  chapter_count: number;
  status: { name: string; id: string };
  genres: { name: string; slug: string; id: string }[];
  team: { name: string; slug: string; id: string } | null;
  is_mature: boolean;
}

export interface MangaDetail {
  id: string;
  name: string;
  slug: string;
  summary: string;
  cover: string;
  type: string;
  status: { name: string; id: string };
  genres: { name: string; id: string }[];
  team: { name: string; slug: string; id: string } | null;
  chapter_count: number;
  rating: string;
  rating_count: number;
  view_count: number;
  bookmark_count: number;
  first_chapter: { id: string; name: string; title: string | null } | null;
  last_chapter: { id: string; name: string; title: string | null } | null;
  is_mature: boolean;
}

export interface MangaChapter {
  id: string;
  name: string;
  title: string | null;
  published_at: string;
  like_count: number;
}

export interface NewChapterEntry {
  series_name: string;
  series_slug: string;
  series_id: string;
  id: string;
  thumbnail: string;
  name: string;
  title: string | null;
  published_at: string;
  type: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

interface ApiSeries {
  id: number | string;
  slug: string;
  titulo: string;
  titulo_alternativo?: string | null;
  sinopsis?: string | null;
  portada?: string | null;
  banner?: string | null;
  tipo?: string | null;
  estado?: string | null;
  generos?: string[];
  puntuacion?: number | string | null;
  puntuacion_count?: number | null;
  vistas?: number | null;
  vistas_total?: number | null;
  favoritos?: number | null;
  capitulos_total?: number | null;
  adulto?: boolean;
  is_adult?: boolean;
  updated_at?: string | null;
  ultimo_capitulo?: ApiChapter | null;
  primer_capitulo?: ApiChapter | null;
  grupo?: {
    id?: number | string;
    slug?: string;
    nombre?: string;
  } | null;
  capitulos?: ApiChapter[];
}

interface ApiChapter {
  id: number | string;
  numero?: number | string | null;
  name?: string | null;
  titulo?: string | null;
  title?: string | null;
  likes?: number | null;
  like_count?: number | null;
  publicado_en?: string | null;
  published_at?: string | null;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Ikigai API error: ${res.status} for ${url} - ${text.slice(0, 200)}`,
      );
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Ikigai API timeout after ${FETCH_TIMEOUT}ms for ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function chapterName(chapter: ApiChapter | null | undefined) {
  const value = chapter?.numero ?? chapter?.name ?? "";
  return String(value).trim();
}

function mapChapter(chapter: ApiChapter): MangaChapter {
  return {
    id: String(chapter.id),
    name: chapterName(chapter),
    title: chapter.titulo ?? chapter.title ?? null,
    published_at: chapter.publicado_en ?? chapter.published_at ?? "",
    like_count: Number(chapter.likes ?? chapter.like_count ?? 0),
  };
}

function mapSeries(series: ApiSeries): MangaSeries {
  const genres = (series.generos || []).map((name) => ({
    id: name,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  }));

  return {
    id: String(series.id),
    name: series.titulo,
    slug: series.slug,
    cover: series.portada || series.banner || "",
    type: series.tipo || "Comics",
    chapter_count: Number(series.capitulos_total ?? 0),
    status: { id: series.estado || "", name: series.estado || "" },
    genres,
    team: series.grupo
      ? {
          id: String(series.grupo.id ?? series.grupo.slug ?? ""),
          slug: series.grupo.slug || "",
          name: series.grupo.nombre || "",
        }
      : null,
    is_mature: Boolean(series.adulto ?? series.is_adult),
  };
}

function mapDetail(series: ApiSeries): MangaDetail {
  const chapters = (series.capitulos || []).map(mapChapter);
  const sorted = [...chapters].sort(
    (a, b) => Number(a.name) - Number(b.name),
  );
  const first = sorted[0] || (series.primer_capitulo && mapChapter(series.primer_capitulo));
  const last =
    sorted[sorted.length - 1] ||
    (series.ultimo_capitulo && mapChapter(series.ultimo_capitulo));

  return {
    ...mapSeries(series),
    summary: series.sinopsis || "",
    rating: String(series.puntuacion ?? "0"),
    rating_count: Number(series.puntuacion_count ?? 0),
    view_count: Number(series.vistas_total ?? series.vistas ?? 0),
    bookmark_count: Number(series.favoritos ?? 0),
    first_chapter: first
      ? { id: first.id, name: first.name, title: first.title }
      : null,
    last_chapter: last ? { id: last.id, name: last.name, title: last.title } : null,
  };
}

function toPaginated<T>(
  data: T[],
  page: number,
  perPage = SEARCH_PAGE_SIZE,
): PaginatedResponse<T> {
  const hasNextPage = data.length >= perPage;
  return {
    data,
    current_page: page,
    last_page: hasNextPage ? page + 1 : page,
    total: hasNextPage ? page * perPage + 1 : (page - 1) * perPage + data.length,
    per_page: perPage,
  };
}

async function getSeriesSearch(page = 1, query = "") {
  const url = new URL(`${API_BASE}/series/search`);
  url.searchParams.set("page", String(page));
  if (query) url.searchParams.set("q", query);
  const response = await fetchJSON<{ data: ApiSeries[] }>(url.toString());
  return response.data || [];
}

async function fetchLegacy<T>(path: string): Promise<T> {
  return fetchJSON(`${LEGACY_API_BASE}${path}`);
}

export async function getPopularManga(
  page = 1,
): Promise<PaginatedResponse<MangaSeries & { rank: number; views: number }>> {
  try {
    const series = await getSeriesSearch(page);
    const mapped = series.map((item, index) => ({
      ...mapSeries(item),
      rank: (page - 1) * SEARCH_PAGE_SIZE + index + 1,
      views: Number(item.vistas_total ?? item.vistas ?? 0),
    }));
    return toPaginated(mapped, page);
  } catch {
    return fetchLegacy(
      `/series/ranking-list?type=total_ranking&series_type=comic&nsfw=false&page=${page}`,
    );
  }
}

export async function getNewChapters(
  page = 1,
): Promise<PaginatedResponse<NewChapterEntry>> {
  try {
    const series = await getSeriesSearch(page);
    const data = series.map((item) => {
      const last = item.ultimo_capitulo || item.capitulos?.[0] || null;
      return {
        series_name: item.titulo,
        series_slug: item.slug,
        series_id: String(item.id),
        id: String(last?.id ?? item.id),
        thumbnail: item.portada || item.banner || "",
        name: chapterName(last) || String(item.capitulos_total ?? ""),
        title: last?.titulo ?? last?.title ?? null,
        published_at: last?.publicado_en ?? item.updated_at ?? "",
        type: item.tipo || "Comics",
      };
    });
    return toPaginated(data, page);
  } catch {
    return fetchLegacy(`/new-chapters?nsfw=false&page=${page}`);
  }
}

export async function getAllSeries(
  page = 1,
  pageSize = 15,
): Promise<PaginatedResponse<MangaSeries>> {
  try {
    const series = await getSeriesSearch(page);
    return toPaginated(series.map(mapSeries), page, pageSize);
  } catch {
    return fetchLegacy(`/series?page=${page}&pageSize=${pageSize}&sort=desc`);
  }
}

export async function getMangaDetail(
  slug: string,
): Promise<{ series: MangaDetail; similar_series: MangaSeries[] | null }> {
  try {
    const response = await fetchJSON<{ data: ApiSeries }>(
      `${API_BASE}/series/${encodeURIComponent(slug)}`,
    );
    return { series: mapDetail(response.data), similar_series: null };
  } catch {
    return fetchLegacy(`/series/${encodeURIComponent(slug)}`);
  }
}

export async function getMangaChapters(
  slug: string,
  page = 1,
): Promise<{
  data: MangaChapter[];
  meta: { current_page: number; last_page: number; total: number };
}> {
  try {
    const response = await fetchJSON<{ data: ApiSeries }>(
      `${API_BASE}/series/${encodeURIComponent(slug)}`,
    );
    const all = (response.data.capitulos || [])
      .map(mapChapter)
      .sort((a, b) => Number(b.name) - Number(a.name));
    const perPage = 50;
    const start = (page - 1) * perPage;
    const data = all.slice(start, start + perPage);
    return {
      data,
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(all.length / perPage)),
        total: all.length,
      },
    };
  } catch {
    return fetchLegacy(
      `/series/${encodeURIComponent(slug)}/chapters?page=${page}`,
    );
  }
}
