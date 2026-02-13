"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import type { AnimeCard as AnimeCardType } from "@/lib/animeflv";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const [results, setResults] = useState<AnimeCardType[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(q);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setResults([]);
        setLoading(false);
      });
  }, [q]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Search form */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-10">
        <div className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar anime..."
            className="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary border border-border text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-base transition-all"
          />
        </div>
      </form>

      {q && (
        <h1 className="text-xl sm:text-2xl font-semibold text-white mb-6">
          Resultados para: <span className="text-primary">{q}</span>
        </h1>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => (
              <AnimeCardSkeleton key={i} />
            ))
          : results.map((anime) => (
              <AnimeCard
                key={anime.slug}
                title={anime.title}
                poster={anime.poster}
                slug={anime.slug}
                type={anime.type}
              />
            ))}
      </div>

      {!loading && results.length === 0 && q && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            No se encontraron resultados para &quot;{q}&quot;
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Intenta con otro termino de busqueda
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <AnimeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
