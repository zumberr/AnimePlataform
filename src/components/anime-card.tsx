"use client";

import Link from "next/link";
import { Play } from "lucide-react";

interface AnimeCardProps {
  title: string;
  poster: string;
  slug: string;
  type?: string;
  episodeSlug?: string;
  episodeNumber?: string;
}

export function AnimeCard({
  title,
  poster,
  slug,
  type,
  episodeSlug,
  episodeNumber,
}: AnimeCardProps) {
  const href = episodeSlug ? `/episode/${episodeSlug}` : `/anime/${slug}`;
  const imgSrc = `/api/proxy-image?url=${encodeURIComponent(poster)}`;

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
        <img
          src={imgSrc}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-primary/90 rounded-full p-3">
            <Play size={24} className="text-white fill-white" />
          </div>
        </div>
        {/* Type badge */}
        {type && (
          <span className="absolute top-2 left-2 bg-primary/90 text-white text-xs font-medium px-2 py-0.5 rounded">
            {type}
          </span>
        )}
        {/* Episode badge */}
        {episodeNumber && (
          <span className="absolute top-2 right-2 bg-accent/90 text-white text-xs font-medium px-2 py-0.5 rounded">
            Ep {episodeNumber}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
    </Link>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="block">
      <div className="aspect-[3/4] rounded-lg bg-secondary animate-pulse" />
      <div className="mt-2 h-4 bg-secondary rounded animate-pulse w-3/4" />
    </div>
  );
}
