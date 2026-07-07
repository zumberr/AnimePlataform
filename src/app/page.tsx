"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { WeeklySchedule } from "@/components/weekly-schedule";
import type { AnimeCard as AnimeCardType, RecentEpisode } from "@/lib/animeflv";
import { Clock, TrendingUp } from "lucide-react";
import { MangaSection } from "@/components/manga-section";

interface HomeData {
  recent: RecentEpisode[];
  trending: AnimeCardType[];
}

type RecentFilter =
  | "todos"
  | "hoy"
  | "ayer"
  | "anteayer"
  | "dia3"
  | "dia4"
  | "dia5"
  | "dia6";

const recentFilters = [
  { key: "todos", label: "Todos" },
  { key: "hoy", label: "Hoy" },
  { key: "ayer", label: "Ayer" },
  { key: "anteayer", label: "Anteayer" },
  { key: "dia3", label: "Hace 3 dias" },
  { key: "dia4", label: "Hace 4 dias" },
  { key: "dia5", label: "Hace 5 dias" },
  { key: "dia6", label: "Hace 6 dias" },
] as const;

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentFilter, setRecentFilter] = useState<RecentFilter>("todos");

  useEffect(() => {
    fetch("/api/home")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar los datos. Intenta de nuevo.");
        setLoading(false);
      });
  }, []);

  const filteredRecent = useMemo(() => {
    if (!data?.recent?.length) return [];
    const rec = data.recent;
    const total = rec.length;

    if (recentFilter === "todos") return rec;

    const dayFilters = recentFilters
      .filter((filter) => filter.key !== "todos")
      .map((filter) => filter.key);
    const groupSize = Math.max(1, Math.ceil(total / dayFilters.length));
    const filterIndex = dayFilters.indexOf(recentFilter);

    if (filterIndex === -1) return rec;

    const start = filterIndex * groupSize;
    return rec.slice(start, start + groupSize);
  }, [data?.recent, recentFilter]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-16 max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            <span className="text-[#8b5cf6]">Anime</span>
            <span className="text-white">Zone</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            Tu destino para ver anime online. Episodios recientes, series
            populares y mas.
          </p>
        </div>

        {error && (
          <div className="text-center py-20">
            <p className="text-destructive">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/80 transition"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Recent Episodes - with day filter */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              <h2 className="text-xl sm:text-2xl font-semibold text-white">
                Episodios Recientes
              </h2>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {recentFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setRecentFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    recentFilter === f.key
                      ? "bg-primary text-white border-primary"
                      : "bg-secondary/70 text-muted-foreground border-border hover:text-white hover:border-primary/40"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {loading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <AnimeCardSkeleton key={i} />
                ))
              : filteredRecent.map((ep, i) => (
                  <AnimeCard
                    key={`${ep.slug}-${i}`}
                    title={ep.animeTitle}
                    poster={ep.poster}
                    slug={ep.animeSlug}
                    episodeSlug={ep.slug}
                    episodeNumber={ep.episodeNumber}
                  />
                ))}
          </div>

          {!loading && filteredRecent.length === 0 && !error && (
            <p className="text-muted-foreground text-center py-8">
              No se encontraron episodios recientes
            </p>
          )}
          <div className="mt-2 text-[10px] text-muted-foreground">
            Los grupos por dia son aproximados segun el orden de publicacion
            mas reciente.
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="mb-12">
          <WeeklySchedule />
        </div>

        {/* Trending */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Animes Populares
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {loading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <AnimeCardSkeleton key={i} />
                ))
              : data?.trending?.map((anime) => (
                  <AnimeCard
                    key={anime.slug}
                    title={anime.title}
                    poster={anime.poster}
                    slug={anime.slug}
                    type={anime.type}
                  />
                ))}
          </div>
          {!loading &&
            (!data?.trending || data.trending.length === 0) &&
            !error && (
              <p className="text-muted-foreground text-center py-8">
                No se encontraron animes populares
              </p>
            )}
        </div>
      </section>

      {/* Manga / Manhwa Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-10 max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 bg-primary rounded-full" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Manhwa
            </h2>
          </div>
          <p className="text-muted-foreground text-sm ml-5">
            Los mejores manhwas en español, actualizados diariamente.
          </p>
        </div>
        <MangaSection />
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>
            AnimeZone no aloja ningun contenido. Todo el contenido es
            proporcionado por terceros.
          </p>
        </div>
      </footer>
    </div>
  );
}
