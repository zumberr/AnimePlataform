"use client";

import { useEffect, useState } from "react";
import { MangaCard, MangaCardSkeleton } from "@/components/manga-card";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import type { MangaSeries } from "@/lib/ikigai";

interface PageData {
  data: MangaSeries[];
  current_page: number;
  last_page: number;
  total: number;
}

export default function MangaListPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/manga/list?page=${page}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((err) => {
        setError(err.message || "Error al cargar mangas");
        setLoading(false);
      });
  }, [page]);

  if (error && !data) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <BookOpen size={48} className="text-muted-foreground" />
            <p className="text-destructive text-sm">{error}</p>
            <button
              onClick={() => setPage(1)}
              className="text-primary hover:underline text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={28} className="text-primary" />
            <h1 className="text-3xl font-bold text-white">Manhwa</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Explora nuestra coleccion de manhwas en español.
            {data?.total != null && (
              <span className="ml-1 text-xs">
                ({data.total.toLocaleString()} series)
              </span>
            )}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 18 }).map((_, i) => (
              <MangaCardSkeleton key={i} />
            ))
            : data?.data?.map((manga) => (
              <MangaCard
                key={manga.id}
                title={manga.name}
                cover={manga.cover}
                slug={manga.slug}
                chapterCount={manga.chapter_count}
                type={manga.type}
                status={manga.status?.name}
              />
            ))}
        </div>

        {/* Pagination */}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 disabled:opacity-30 text-foreground text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {generatePageNumbers(page, data.last_page).map((p, i) =>
                p === "..." ? (
                  <span
                    key={`dots-${i}`}
                    className="px-2 text-muted-foreground text-sm"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === p
                        ? "bg-primary text-white"
                        : "bg-secondary hover:bg-secondary/80 text-foreground"
                      }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(data.last_page, p + 1))}
              disabled={page === data.last_page}
              className="flex items-center gap-1 bg-secondary hover:bg-secondary/80 disabled:opacity-30 text-foreground text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
