"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Home, TrendingUp, Menu, X, BookOpen } from "lucide-react";
import { useState, useRef } from "react";

export function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setMobileMenuOpen(false);
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold shrink-0"
          >
            <span className="text-[#8b5cf6]">Anime</span>
            <span className="text-white">Zone</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              <Home size={16} />
              Inicio
            </Link>
            <Link
              href="/search?q=popular"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              <TrendingUp size={16} />
              Popular
            </Link>
            <Link
              href="/manga"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              <BookOpen size={16} />
              Manga
            </Link>
          </div>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex items-center flex-1 max-w-md mx-6"
          >
            <div className="relative w-full">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar anime..."
                className="w-full h-9 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </form>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-white"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a0a0f] border-t border-border px-4 py-4 space-y-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar anime..."
                className="w-full h-10 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </form>
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white py-2"
            >
              <Home size={16} />
              Inicio
            </Link>
            <Link
              href="/search?q=popular"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white py-2"
            >
              <TrendingUp size={16} />
              Popular
            </Link>
            <Link
              href="/manga"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white py-2"
            >
              <BookOpen size={16} />
              Manga
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
