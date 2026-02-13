"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Eye,
  Star,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import type { MangaDetail, MangaChapter } from "@/lib/ikigai";

interface DetailData {
  series: MangaDetail;
  similar_series: null;
}

interface ChaptersData {
  data: MangaChapter[];
  meta: { current_page: number; last_page: number; total: number };
}

export default function MangaDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [detail, setDetail] = useState<DetailData | null>(null);
  const [chapters, setChapters] = useState<ChaptersData | null>(null);
  const [chaptersPage, setChaptersPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/manga/${slug}`).then((r) => r.json()),
      fetch(`/api/manga/${slug}/chapters?page=1`).then((r) => r.json()),
    ])
      .then(([d, c]) => {
        setDetail(d);
        setChapters(c);
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar el manga");
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (chaptersPage === 1) return;
    setChaptersLoading(true);
    fetch(`/api/manga/${slug}/chapters?page=${chaptersPage}`)
      .then((r) => r.json())
      .then((c) => {
        setChapters(c);
        setChaptersLoading(false);
      })
      .catch(() => setChaptersLoading(false));
  }, [chaptersPage, slug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-10">
          {/* Skeleton */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-72 shrink-0">
              <div className="aspect-[3/4] rounded-xl bg-secondary animate-pulse" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-secondary rounded animate-pulse w-3/4" />
              <div className="h-4 bg-secondary rounded animate-pulse w-1/3" />
              <div className="h-20 bg-secondary rounded animate-pulse" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-7 w-20 bg-secondary rounded-full animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail?.series) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Manga no encontrado"}</p>
          <Link
            href="/"
            className="text-primary hover:underline text-sm"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const manga = detail.series;

  function formatViews(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  return (
    <div className="min-h-screen">
      {/* Banner background */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={manga.cover}
          alt=""
          className="w-full h-full object-cover blur-2xl scale-110 opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background" />
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-40 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Cover */}
          <div className="w-48 sm:w-56 md:w-64 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[3/4] rounded-xl overflow-hidden ring-2 ring-border shadow-2xl shadow-black/50">
              <img
                src={manga.cover}
                alt={manga.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {manga.name}
            </h1>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1.5">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                {Number(manga.rating).toFixed(1)}
                <span className="text-xs">({manga.rating_count})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Eye size={14} />
                {formatViews(manga.view_count)}
              </span>
              <span className="flex items-center gap-1.5">
                <Bookmark size={14} />
                {formatViews(manga.bookmark_count)}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} />
                {manga.chapter_count} caps
              </span>
            </div>

            {/* Status & type */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium px-3 py-1 rounded-full">
                {manga.status?.name || "Desconocido"}
              </span>
              <span className="inline-flex items-center bg-primary/10 text-primary border border-primary/20 text-xs font-medium px-3 py-1 rounded-full uppercase">
                {manga.type === "comic" ? "Manhwa" : manga.type}
              </span>
              {manga.team && (
                <span className="inline-flex items-center bg-secondary text-muted-foreground border border-border text-xs px-3 py-1 rounded-full">
                  {manga.team.name}
                </span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {manga.genres
                .filter((g) => g.name !== "MangoScan")
                .map((genre) => (
                  <span
                    key={genre.id}
                    className="bg-secondary text-foreground text-xs px-2.5 py-1 rounded-md border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    {genre.name}
                  </span>
                ))}
            </div>

            {/* Synopsis */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {manga.summary || "Sin sinopsis disponible."}
            </p>

            {/* Action buttons */}
            {manga.first_chapter && (
              <div className="flex gap-3">
                <Link
                  href={`/manga/${slug}/${manga.first_chapter.name}`}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/80 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  <BookOpen size={16} />
                  Leer Capitulo 1
                </Link>
                {manga.last_chapter && (
                  <Link
                    href={`/manga/${slug}/${manga.last_chapter.name}`}
                    className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
                  >
                    Cap. {manga.last_chapter.name}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chapters list */}
        <div className="mt-10 mb-16">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-white">Capitulos</h2>
            {chapters?.meta && (
              <span className="text-xs text-muted-foreground ml-auto">
                {chapters.meta.total} capitulos
              </span>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {chaptersLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">
                Cargando capitulos...
              </div>
            ) : (
              <div className="divide-y divide-border">
                {chapters?.data?.map((chapter) => (
                  <Link
                    key={chapter.id}
                    href={`/manga/${slug}/${chapter.name}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        Capitulo {chapter.name}
                      </span>
                      {chapter.title && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          - {chapter.title}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(chapter.published_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {chapters?.meta && chapters.meta.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t border-border">
                <button
                  onClick={() => setChaptersPage((p) => Math.max(1, p - 1))}
                  disabled={chaptersPage === 1}
                  className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-muted-foreground px-3">
                  {chaptersPage} / {chapters.meta.last_page}
                </span>
                <button
                  onClick={() =>
                    setChaptersPage((p) =>
                      Math.min(chapters.meta.last_page, p + 1)
                    )
                  }
                  disabled={chaptersPage === chapters.meta.last_page}
                  className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
