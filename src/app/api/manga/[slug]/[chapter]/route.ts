import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const READER_DOMAINS = [
  "https://visorikigai.net",
  "https://ikigaimangas.com",
];

const CHAPTER_ID_READER_DOMAINS = [
  "https://visualikigai.com",
  "https://zonaikigai.melauroral.com",
  "https://visorikigai.techbee.site",
  "https://visualikigai.gettocaboca.com",
  "https://viralikigai.glovix.one",
  "https://zonaikigai.foodib.net",
];

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
};

const FETCH_TIMEOUT_MS = 8000;
const IMAGE_PROBE_TIMEOUT_MS = 4500;

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeImageUrl(raw: string, domain: string) {
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `${domain}${raw}`;
  return raw;
}

function isIkigaiImageUrl(url: string) {
  return (
    url.includes("media.ikigaimangas.cloud/series/") ||
    url.includes("image.ikigaimangas.cloud/series/") ||
    (url.includes("ikigaimangas") &&
      /\.(webp|png|jpe?g|avif)(\?|$)/i.test(url))
  );
}

async function imageExists(url: string) {
  try {
    const head = await fetchWithTimeout(
      url,
      {
        method: "HEAD",
        headers: { "User-Agent": HEADERS["User-Agent"] },
      },
      IMAGE_PROBE_TIMEOUT_MS
    );
    if (head.ok) return true;

    // Some CDNs block HEAD but serve the file with GET.
    if (head.status !== 403 && head.status !== 405) return false;
  } catch {
    // Fall through to GET probe.
  }

  try {
    const get = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          Range: "bytes=0-0",
        },
      },
      IMAGE_PROBE_TIMEOUT_MS
    );
    return get.ok;
  } catch {
    return false;
  }
}

function extractIkigaiImageUrls(text: string) {
  const normalized = text.replace(/\\\//g, "/");
  const matches = normalized.match(
    /https?:\/\/(?:media|image)\.ikigaimangas\.cloud\/series\/[^\s"'<>\\]+?\.(?:webp|png|jpe?g|avif)/gi
  );
  if (!matches) return [];
  return [...new Set(matches)];
}

async function tryFetchChapterImagesById(
  chapterId: string,
  seriesId: string
): Promise<string[]> {
  for (const domain of CHAPTER_ID_READER_DOMAINS) {
    try {
      const res = await fetchWithTimeout(
        `${domain}/capitulo/${chapterId}/`,
        {
          headers: HEADERS,
          redirect: "follow",
        },
        FETCH_TIMEOUT_MS
      );
      if (!res.ok) continue;

      const html = await res.text();
      const directMatches = extractIkigaiImageUrls(html);
      if (directMatches.length > 0) {
        return directMatches;
      }

      // Some mirrors expose only filenames (e.g. 1_1.webp) in serialized payloads.
      const filenameMatches = html
        .replace(/\\\//g, "/")
        .match(/\b\d+_\d+\.(?:webp|png|jpe?g|avif)\b/gi);
      if (filenameMatches && filenameMatches.length > 0) {
        const uniqueFiles = [...new Set(filenameMatches)];
        return uniqueFiles.map(
          (filename) =>
            `https://media.ikigaimangas.cloud/series/${seriesId}/${chapterId}/${filename}`
        );
      }
    } catch {
      continue;
    }
  }

  return [];
}

async function tryFetchChapterImages(
  slug: string,
  chapter: string
): Promise<string[]> {
  for (const domain of READER_DOMAINS) {
    try {
      const url = `${domain}/series/${slug}/chapter/${chapter}`;
      const res = await fetchWithTimeout(
        url,
        {
          headers: HEADERS,
          redirect: "follow",
        },
        FETCH_TIMEOUT_MS
      );

      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);

      // Try multiple patterns for image extraction
      const images: string[] = [];

      // Pattern 1: section div img (Tachiyomi pattern)
      $("section div img").each((_, el) => {
        const src = normalizeImageUrl(
          $(el).attr("src") || $(el).attr("data-src") || "",
          domain
        );
        if (isIkigaiImageUrl(src)) {
          images.push(src);
        }
      });

      // Pattern 2: any img with ikigaimangas CDN
      if (images.length === 0) {
        $("img").each((_, el) => {
          const src = normalizeImageUrl(
            $(el).attr("src") || $(el).attr("data-src") || "",
            domain
          );
          if (isIkigaiImageUrl(src)) {
            images.push(src);
          }
        });
      }

      // Pattern 3: Look for JSON data in script tags
      if (images.length === 0) {
        $("script").each((_, el) => {
          const content = ($(el).html() || "").replace(/\\\//g, "/");
          const urlMatches = extractIkigaiImageUrls(content);
          if (urlMatches) {
            images.push(...urlMatches);
          }
        });
      }

      if (images.length > 0) {
        return [...new Set(images)];
      }
    } catch {
      continue;
    }
  }

  return [];
}

// Fallback: construct image URLs based on known pattern
async function constructImageUrls(
  seriesSlug: string,
  chapter: string
): Promise<string[]> {
  const normalizeChapter = (value: string) => {
    const cleaned = value.trim().replace(",", ".");
    const asNumber = Number(cleaned);
    if (Number.isFinite(asNumber)) {
      return asNumber.toString();
    }
    return cleaned.toLowerCase();
  };

  const isSameChapter = (sourceName: string, targetName: string) =>
    sourceName === targetName ||
    normalizeChapter(sourceName) === normalizeChapter(targetName);

  // Use the API to get chapter info to find the chapter ID
  try {
    const chaptersBaseUrl = `https://panel.ikigaimangas.com/api/swf/series/${encodeURIComponent(seriesSlug)}/chapters`;

    type ChapterEntry = { id: string; name: string };
    type ChapterResponse = {
      data?: ChapterEntry[];
      meta?: { last_page?: number };
    };

    const firstPageRes = await fetchWithTimeout(
      `${chaptersBaseUrl}?page=1&pageSize=100`,
      { headers: { "User-Agent": HEADERS["User-Agent"] } }
    );
    if (!firstPageRes.ok) return [];

    const firstPageData: ChapterResponse = await firstPageRes.json();
    const lastPage = firstPageData.meta?.last_page ?? 1;
    const targetAsNumber = Number(normalizeChapter(chapter));
    const scanFromLast =
      Number.isFinite(targetAsNumber) && targetAsNumber >= 0 && targetAsNumber <= 5;

    const pagesToScan: number[] = scanFromLast
      ? Array.from({ length: lastPage }, (_, i) => lastPage - i)
      : Array.from({ length: lastPage }, (_, i) => i + 1);

    let chapterData = firstPageData.data?.find((c) =>
      isSameChapter(c.name, chapter)
    );

    // For early chapters (e.g. chapter 1), scanning from last page is much faster.
    for (const page of pagesToScan) {
      if (chapterData) break;
      if (page === 1) continue;

      const pageRes = await fetchWithTimeout(
        `${chaptersBaseUrl}?page=${page}&pageSize=100`,
        {
        headers: { "User-Agent": HEADERS["User-Agent"] },
        }
      );
      if (!pageRes.ok) continue;

      const pageData: ChapterResponse = await pageRes.json();
      chapterData = pageData.data?.find((c) => isSameChapter(c.name, chapter));
    }

    if (!chapterData) return [];

    // Try to fetch chapter images from the chapter ID
    // The image pattern is: media.ikigaimangas.cloud/series/{seriesId}/{chapterId}/01.webp
    const seriesRes = await fetchWithTimeout(
      `https://panel.ikigaimangas.com/api/swf/series/${encodeURIComponent(seriesSlug)}`,
      { headers: { "User-Agent": HEADERS["User-Agent"] } }
    );
    if (!seriesRes.ok) return [];

    const seriesData = await seriesRes.json();
    const seriesId = seriesData.series?.id;
    if (!seriesId) return [];

    // New reader mirrors expose chapter pages by chapter ID and include real image URLs.
    const chapterPageImages = await tryFetchChapterImagesById(
      chapterData.id,
      seriesId
    );
    if (chapterPageImages.length > 0) {
      return chapterPageImages;
    }

    const baseUrl = `https://media.ikigaimangas.cloud/series/${seriesId}/${chapterData.id}`;

    const namePatterns = [
      (i: number) => `${String(i).padStart(2, "0")}.webp`,
      (i: number) => `${String(i).padStart(3, "0")}.webp`,
      (i: number) => `${i}.webp`,
      (i: number) => `${String(i).padStart(2, "0")}.jpg`,
      (i: number) => `${String(i).padStart(2, "0")}.jpeg`,
      (i: number) => `${String(i).padStart(2, "0")}.png`,
    ];

    for (const pattern of namePatterns) {
      const images: string[] = [];
      for (let i = 1; i <= 80; i++) {
        const imgUrl = `${baseUrl}/${pattern(i)}`;
        const exists = await imageExists(imgUrl);

        if (exists) {
          images.push(imgUrl);
          continue;
        }

        // Stop probing this pattern if we already found at least one image.
        if (images.length > 0) break;
      }

      if (images.length > 0) return images;
    }

    return [];
  } catch {
    return [];
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; chapter: string }> }
) {
  try {
    const { slug, chapter } = await params;

    // Try scraping first
    let images = await tryFetchChapterImages(slug, chapter);

    // Fallback to constructed URLs
    if (images.length === 0) {
      images = await constructImageUrls(slug, chapter);
    }

    return NextResponse.json({ images, slug, chapter });
  } catch (error) {
    console.error("Chapter reader error:", error);
    return NextResponse.json(
      { error: "Error al cargar el capitulo", images: [] },
      { status: 500 }
    );
  }
}
