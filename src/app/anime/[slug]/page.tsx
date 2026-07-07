"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { AnimeDetail } from "@/lib/animeflv";
import {
  Play,
  ArrowLeft,
  Star,
  Tv,
  Tag,
  ArrowUpDown,
  Search,
} from "lucide-react";

export default function AnimeDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Episodes UI state
  const [showLatestFirst, setShowLatestFirst] = useState(true);
  const [jumpTo, setJumpTo] = useState("");

  const sortedEpisodes = useMemo(() => {
    if (!anime) return [];
    const eps = [...anime.episodes];
    return showLatestFirst ? [...eps].reverse() : eps;
  }, [anime, showLatestFirst]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/anime/${slug}`)
      .then((res) => res.json())
      .then((d) => {
        setAnime(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary rounded w-48 mb-8" />
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-72 aspect-[3/4] bg-secondary rounded-xl shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-secondary rounded w-3/4" />
              <div className="h-4 bg-secondary rounded w-1/4" />
              <div className="h-20 bg-secondary rounded" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-6 bg-secondary rounded w-16" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!anime || !anime.title) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Anime no encontrado</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const posterSrc = `/api/proxy-image?url=${encodeURIComponent(anime.poster)}`;

  return (
    <div className="min-h-screen">
      {/* Back link */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>
      </div>

      {/* Anime info */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Poster */}
          <div className="w-full max-w-[280px] mx-auto md:mx-0 md:w-72 shrink-0">
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-secondary shadow-2xl shadow-primary/10">
              <img
                src={posterSrc}
                alt={anime.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              {anime.title}
            </h1>
            {anime.altTitle && (
              <p className="text-muted-foreground text-sm mt-1">
                {anime.altTitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4">
              {anime.type && (
                <span className="inline-flex items-center gap-1 bg-primary/20 text-primary text-xs font-medium px-3 py-1 rounded-full">
                  <Tv size={12} />
                  {anime.type}
                </span>
              )}
              {anime.status && (
                <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1 rounded-full">
                  {anime.status}
                </span>
              )}
              {anime.rating && (
                <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium px-3 py-1 rounded-full">
                  <Star size={12} />
                  {anime.rating}
                </span>
              )}
            </div>

            {/* Genres */}
            {anime.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {anime.genres.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full border border-border"
                  >
                    <Tag size={10} />
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            {anime.synopsis && (
              <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                {anime.synopsis}
              </p>
            )}

            {/* Quick play */}
            {anime.episodes.length > 0 && (
              <Link
                href={`/episode/${slug}-${anime.episodes[0].number}`}
                className="mt-6 inline-flex items-center gap-2 bg-primary hover:bg-primary/80 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                <Play size={18} className="fill-white" />
                Ver Episodio 1
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Episodes List - visually & technically improved */}
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-semibold text-white">
              Episodios{" "}
              <span className="text-muted-foreground font-normal">
                ({anime.episodes.length})
              </span>
            </h2>
            {anime.episodes.length > 0 && (
              <Link
                href={`/episode/${slug}-${anime.episodes[anime.episodes.length - 1].number}`}
                className="inline-flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full transition"
              >
                <Play size={12} /> Ver último
              </Link>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Jump to episode */}
            <div className="relative">
              <input
                type="number"
                min={1}
                max={anime.episodes.length}
                value={jumpTo}
                onChange={(e) => setJumpTo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && jumpTo) {
                    const n = Math.max(
                      1,
                      Math.min(anime.episodes.length, parseInt(jumpTo)),
                    );
                    window.location.href = `/episode/${slug}-${n}`;
                  }
                }}
                placeholder="Ir al Ep"
                className="bg-secondary border border-border w-24 text-sm rounded-lg pl-8 py-1.5 focus:outline-none focus:border-primary/60 placeholder:text-muted-foreground"
              />
              <Search
                size={14}
                className="absolute left-2.5 top-2.5 text-muted-foreground"
              />
            </div>

            {/* Order toggle */}
            <button
              onClick={() => setShowLatestFirst(!showLatestFirst)}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-lg transition active:scale-[0.985]"
            >
              <ArrowUpDown size={15} />
              {showLatestFirst ? "Más recientes primero" : "Del 1 al último"}
            </button>
          </div>
        </div>

        {/* Episodes grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-10 gap-2 sm:gap-2.5">
          {sortedEpisodes.map((ep) => (
            <Link
              key={ep.number}
              href={`/episode/${slug}-${ep.number}`}
              className="group flex items-center gap-3 bg-secondary hover:bg-primary/10 border border-border hover:border-primary/50 rounded-xl px-3 py-2.5 transition-all active:scale-[0.985]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/40 group-hover:bg-primary/90 transition-colors">
                <Play
                  size={15}
                  className="text-muted-foreground group-hover:text-white transition-colors"
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white group-hover:text-primary transition">
                  Episodio {ep.number}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Ver ahora
                </div>
              </div>
            </Link>
          ))}
        </div>

        {anime.episodes.length === 0 && (
          <p className="text-muted-foreground text-sm py-4">
            No se encontraron episodios.
          </p>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          Tip: Usa el campo “Ir al Ep” o cambia el orden para encontrar más
          rápido.
        </div>
      </div>
    </div>
  );
}
