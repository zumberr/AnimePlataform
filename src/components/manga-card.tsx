"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

interface MangaCardProps {
  title: string;
  cover: string;
  slug: string;
  chapterCount?: number;
  chapterName?: string;
  type?: string;
  status?: string;
}

export function MangaCard({
  title,
  cover,
  slug,
  chapterCount,
  chapterName,
  type,
  status,
}: MangaCardProps) {
  return (
    <Link href={`/manga/${slug}`} className="group block">
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-secondary ring-1 ring-border/50 group-hover:ring-primary/50 transition-all duration-300">
        <img
          src={cover}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Read icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-primary rounded-full p-3 shadow-lg shadow-primary/30 scale-75 group-hover:scale-100 transition-transform duration-300">
            <BookOpen size={22} className="text-white" />
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          {type && (
            <span className="bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
              {type === "comic" ? "Manhwa" : type}
            </span>
          )}
          {status && (
            <span className="bg-black/60 backdrop-blur-sm text-emerald-400 text-[10px] font-medium px-2 py-0.5 rounded-md">
              {status}
            </span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {chapterName && (
            <span className="text-[11px] text-primary font-medium">
              Cap. {chapterName}
            </span>
          )}
          {chapterCount !== undefined && !chapterName && (
            <span className="text-[11px] text-muted-foreground">
              {chapterCount} capitulos
            </span>
          )}
        </div>
      </div>
      <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200">
        {title}
      </h3>
    </Link>
  );
}

export function MangaCardSkeleton() {
  return (
    <div className="block">
      <div className="aspect-[3/4] rounded-xl bg-secondary animate-pulse ring-1 ring-border/30" />
      <div className="mt-2 h-4 bg-secondary rounded animate-pulse w-3/4" />
      <div className="mt-1 h-3 bg-secondary rounded animate-pulse w-1/2" />
    </div>
  );
}
