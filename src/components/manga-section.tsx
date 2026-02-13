"use client";

import { useEffect, useState } from "react";
import { MangaCard, MangaCardSkeleton } from "./manga-card";
import { BookOpen, Flame, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { MangaSeries, NewChapterEntry } from "@/lib/ikigai";

interface MangaHomeData {
  popular: (MangaSeries & { rank: number; views: number })[];
  recent: NewChapterEntry[];
}

export function MangaSection() {
  const [data, setData] = useState<MangaHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/manga/home")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("MangaSection error:", err);
        setError("Error al cargar mangas");
        setLoading(false);
      });
  }, []);

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Recent manga updates */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Manhwa Recientes
            </h2>
          </div>
          <Link
            href="/manga"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Ver todo
            <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
              <MangaCardSkeleton key={i} />
            ))
            : data?.recent?.map((entry) => (
              <MangaCard
                key={entry.id}
                title={entry.series_name}
                cover={entry.thumbnail}
                slug={entry.series_slug}
                chapterName={entry.name}
                type={entry.type}
              />
            ))}
        </div>
      </div>

      {/* Popular manga */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-orange-500" />
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Manhwa Populares
            </h2>
          </div>
          <Link
            href="/manga"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Ver todo
            <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
              <MangaCardSkeleton key={i} />
            ))
            : data?.popular?.map((manga) => (
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
      </div>
    </div>
  );
}
