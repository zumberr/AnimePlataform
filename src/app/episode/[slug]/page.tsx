"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Monitor,
  AlertCircle,
} from "lucide-react";
import type { EpisodeSource } from "@/lib/animeflv";

interface EpisodeData {
  sources: EpisodeSource[];
  animeSlug: string;
  episodeNumber: string;
  animeTitle: string;
}

function getServerLabel(source: EpisodeSource, index: number) {
  const raw = (source.server || "").trim();
  const cleanRaw = raw
    .replace(/(Tio\s*){2,}/gi, "Tio ")
    .replace(/TioAnime/gi, "Tio")
    .replace(/\s+/g, " ")
    .trim();

  try {
    const host = new URL(source.url).hostname.replace(/^www\./, "");
    const lowerHost = host.toLowerCase();
    if (lowerHost.includes("dood")) return "Dood";
    if (lowerHost.includes("streamsb") || lowerHost.includes("sb")) {
      return "StreamSB";
    }
    if (lowerHost.includes("streamtape")) return "Streamtape";
    if (lowerHost.includes("fembed") || lowerHost.includes("fplayer")) {
      return "Fembed";
    }
    if (lowerHost.includes("mega")) return "Mega";
    if (lowerHost.includes("vid")) return "Vid";
    if (!lowerHost.includes("tioanime.com")) {
      const name = host.split(".")[0].replace(/[-_]+/g, " ");
      return name.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } catch {}

  if (!cleanRaw || /^tio(?:\s*player)?$/i.test(cleanRaw)) {
    return `Servidor ${index + 1}`;
  }

  return cleanRaw.replace(/^Tio\s+/i, "");
}

export default function EpisodePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<EpisodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState(0);
  const [failedServers, setFailedServers] = useState<Set<number>>(new Set());
  const [iframeError, setIframeError] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [maxEpisode, setMaxEpisode] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/episode/${slug}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  // Fetch anime detail to know last episode number for navigation (hide "ep X+1" if it doesn't exist)
  useEffect(() => {
    if (!data?.animeSlug) return;
    const controller = new AbortController();
    fetch(`/api/anime/${data.animeSlug}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.episodes?.length) {
          const nums = d.episodes
            .map((e: { number: number }) => e.number)
            .filter((n: number) => Number.isFinite(n));
          setMaxEpisode(nums.length ? Math.max(...nums) : null);
        } else {
          setMaxEpisode(null);
        }
      })
      .catch(() => setMaxEpisode(null));
    return () => controller.abort();
  }, [data?.animeSlug]);

  // Reset error states when switching sources
  useEffect(() => {
    setIframeError(false);
    setIsSwitching(true);
    const t = setTimeout(() => setIsSwitching(false), 650);
    return () => clearTimeout(t);
  }, [activeSource]);

  const handleIframeError = () => {
    if (!data) return;
    const newFailed = new Set(failedServers);
    newFailed.add(activeSource);
    setFailedServers(newFailed);

    // Try next available server
    const nextServer = data.sources.findIndex(
      (_, i) => i !== activeSource && !newFailed.has(i),
    );
    if (nextServer !== -1) {
      setActiveSource(nextServer);
    } else {
      setIframeError(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-secondary rounded w-32" />
          <div className="aspect-video bg-secondary rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-secondary rounded w-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle
            size={48}
            className="text-muted-foreground mx-auto mb-4"
          />
          <p className="text-muted-foreground text-lg">
            Episodio no encontrado
          </p>
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

  const epNum = parseInt(data.episodeNumber);
  const prevSlug = epNum > 1 ? `${data.animeSlug}-${epNum - 1}` : null;
  const maxEpKnown = maxEpisode != null ? maxEpisode : null;
  const hasNext = maxEpKnown != null ? epNum < maxEpKnown : true;
  const nextSlug = hasNext ? `${data.animeSlug}-${epNum + 1}` : null;
  const currentSource = data.sources[activeSource];

  return (
    <div className="min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
          <Link href="/" className="hover:text-white transition-colors">
            Inicio
          </Link>
          <span>/</span>
          <Link
            href={`/anime/${data.animeSlug}`}
            className="hover:text-white transition-colors"
          >
            {data.animeTitle || data.animeSlug}
          </Link>
          <span>/</span>
          <span className="text-white">Episodio {data.episodeNumber}</span>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">
          {data.animeTitle || data.animeSlug} - Episodio {data.episodeNumber}
        </h1>

        {/* Video Player */}
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl shadow-primary/5 border border-border">
          {currentSource && !iframeError ? (
            <>
              <iframe
                key={`${activeSource}-${currentSource.url}`}
                title={`Reproductor ${activeSource + 1}`}
                src={`/api/embed?url=${encodeURIComponent(currentSource.url)}`}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="no-referrer"
                onError={handleIframeError}
                onLoad={() => setIsSwitching(false)}
              />
              {isSwitching && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Cargando reproductor...
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <AlertCircle
                  size={48}
                  className="text-muted-foreground mx-auto mb-3"
                />
                <p className="text-muted-foreground">
                  {iframeError
                    ? "Todos los servidores fallaron al cargar"
                    : "No se encontraron servidores disponibles"}
                </p>
                {iframeError && (
                  <button
                    onClick={() => {
                      setFailedServers(new Set());
                      setIframeError(false);
                      setActiveSource(0);
                    }}
                    className="mt-3 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/80 transition-colors"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Server selector - improved visual + clean labels */}
        {data.sources.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor size={16} className="text-primary" />
                <h3 className="text-sm font-medium text-white">Servidores</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                  {data.sources.length}
                </span>
              </div>
              <a
                href={currentSource?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                Abrir externo -&gt;
              </a>
            </div>

            {/* Scrollable clean pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide snap-x">
              {data.sources.map((source, i) => {
                const label = getServerLabel(source, i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setFailedServers((prev) => {
                        const next = new Set(prev);
                        next.delete(i);
                        return next;
                      });
                      setIframeError(false);
                      setActiveSource(i);
                    }}
                    className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-[0.985] ${
                      failedServers.has(i)
                        ? "bg-red-500/10 text-red-400 border border-red-500/30 line-through opacity-60"
                        : i === activeSource
                          ? "bg-primary text-white shadow-md shadow-primary/25"
                          : "bg-secondary/70 text-muted-foreground hover:text-white border border-border/60 hover:border-primary/40 hover:bg-secondary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
              Selecciona un servidor. Si uno falla prueba otro.
            </p>
          </div>
        )}

        {/* Episode navigation */}
        <div className="flex items-center justify-between mt-6 gap-4">
          {prevSlug ? (
            <Link
              href={`/episode/${prevSlug}`}
              className="inline-flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border text-sm font-medium text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Episodio {epNum - 1}</span>
              <span className="sm:hidden">Anterior</span>
            </Link>
          ) : (
            <div />
          )}
          <Link
            href={`/anime/${data.animeSlug}`}
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            Ver todos los episodios
          </Link>
          {nextSlug ? (
            <Link
              href={`/episode/${nextSlug}`}
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/80 text-sm font-medium text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Episodio {epNum + 1}</span>
              <span className="sm:hidden">Siguiente</span>
              <ChevronRight size={16} />
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border text-sm font-medium text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              Volver a casa
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
