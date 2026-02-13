const API_BASE = "https://panel.ikigaimangas.com/api/swf";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

// Types

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

// API functions

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Ikigai API error: ${res.status} for ${url}`);
  return res.json();
}

export async function getPopularManga(
  page = 1
): Promise<PaginatedResponse<MangaSeries & { rank: number; views: number }>> {
  return fetchJSON(
    `${API_BASE}/series/ranking-list?type=total&series_type=comic&nsfw=false&page=${page}`
  );
}

export async function getNewChapters(
  page = 1
): Promise<PaginatedResponse<NewChapterEntry>> {
  return fetchJSON(
    `${API_BASE}/new-chapters?nsfw=false&page=${page}`
  );
}

export async function getAllSeries(
  page = 1,
  pageSize = 15
): Promise<PaginatedResponse<MangaSeries>> {
  return fetchJSON(
    `${API_BASE}/series?page=${page}&pageSize=${pageSize}&sort=desc`
  );
}

export async function getMangaDetail(
  slug: string
): Promise<{ series: MangaDetail; similar_series: MangaSeries[] | null }> {
  return fetchJSON(`${API_BASE}/series/${encodeURIComponent(slug)}`);
}

export async function getMangaChapters(
  slug: string,
  page = 1
): Promise<{
  data: MangaChapter[];
  meta: { current_page: number; last_page: number; total: number };
}> {
  return fetchJSON(
    `${API_BASE}/series/${encodeURIComponent(slug)}/chapters?page=${page}`
  );
}
