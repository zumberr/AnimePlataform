"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  BookOpen,
  Loader2,
} from "lucide-react";

interface ReaderData {
  images: string[];
  slug: string;
  chapter: string;
}

interface MangaDetailResponse {
  series?: {
    last_chapter?: {
      name?: string | null;
    } | null;
  };
}

export default function MangaReaderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const chapter = params.chapter as string;

  const [data, setData] = useState<ReaderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [lastChapterName, setLastChapterName] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !chapter) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let active = true;

    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/manga/${slug}/${chapter}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        if (!active) return;
        setData(d);
        window.scrollTo(0, 0);
      })
      .catch(() => {
        if (!active) return;
        setError("Error al cargar el capitulo");
      })
      .finally(() => {
        if (!active) return;
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [slug, chapter]);

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    fetch(`/api/manga/${slug}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<MangaDetailResponse>;
      })
      .then((d) => {
        setLastChapterName(d.series?.last_chapter?.name?.trim() || null);
      })
      .catch(() => {
        setLastChapterName(null);
      });

    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const chapterNum = Number(chapter);
  const normalizeChapterName = (value: string) => {
    const cleaned = value.trim().replace(",", ".");
    const asNumber = Number(cleaned);
    if (Number.isFinite(asNumber)) return asNumber.toString();
    return cleaned.toLowerCase();
  };
  const isLastChapter =
    !!lastChapterName &&
    normalizeChapterName(chapter) === normalizeChapterName(lastChapterName);

  const goToChapter = useCallback(
    (num: number) => {
      router.push(`/manga/${slug}/${num}`);
    },
    [router, slug]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && chapterNum > 1) {
        goToChapter(chapterNum - 1);
      } else if (e.key === "ArrowRight" && !isLastChapter) {
        goToChapter(chapterNum + 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [chapterNum, goToChapter, isLastChapter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando capitulo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Link href={`/manga/${slug}`} className="text-primary hover:underline text-sm">
            Volver al manga
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top navigation bar */}
      <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link
            href={`/manga/${slug}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline truncate max-w-[200px]">
              {slug.replace(/-/g, " ")}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => chapterNum > 1 && goToChapter(chapterNum - 1)}
              disabled={chapterNum <= 1}
              className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-colors"
              title="Capitulo anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-white px-3 min-w-[100px] text-center">
              Cap. {chapter}
            </span>
            {!isLastChapter ? (
              <button
                onClick={() => goToChapter(chapterNum + 1)}
                className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                title="Siguiente capitulo"
              >
                <ChevronRight size={18} />
              </button>
            ) : (
              <div className="w-[30px]" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>

      {/* Chapter images */}
      <div className="max-w-3xl mx-auto">
        {data?.images && data.images.length > 0 ? (
          <div className="flex flex-col">
            {data.images.map((src, i) => (
              <img
                key={`${chapter}-${i}`}
                src={`/api/proxy-image?url=${encodeURIComponent(src)}`}
                alt={`Pagina ${i + 1}`}
                className="w-full h-auto select-none"
                loading={i < 3 ? "eager" : "lazy"}
                draggable={false}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <BookOpen size={48} className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-2">
              No se encontraron imagenes para este capitulo.
            </p>
            <p className="text-xs text-muted-foreground text-center mb-6">
              Es posible que este capitulo no este disponible o que las imagenes
              se carguen de forma diferente.
            </p>
            <Link
              href={`/manga/${slug}`}
              className="text-primary hover:underline text-sm"
            >
              Volver a la lista de capitulos
            </Link>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      {data?.images && data.images.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => chapterNum > 1 && goToChapter(chapterNum - 1)}
              disabled={chapterNum <= 1}
              className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 disabled:opacity-30 text-foreground text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <Link
              href={`/manga/${slug}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Lista de capitulos
            </Link>
            {!isLastChapter ? (
              <button
                onClick={() => goToChapter(chapterNum + 1)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            ) : (
              <div className="w-[110px]" aria-hidden="true" />
            )}
          </div>
        </div>
      )}

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary/80 text-white p-3 rounded-full shadow-lg shadow-primary/30 transition-all"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
