"use client";

import { useEffect, useState } from "react";
import { Calendar, Star, Clock } from "lucide-react";

interface ScheduleAnime {
    mal_id: number;
    title: string;
    poster: string;
    type: string;
    score: number | null;
    broadcast_time: string | null;
}

const DAYS = [
    { key: "monday", label: "Lunes" },
    { key: "tuesday", label: "Martes" },
    { key: "wednesday", label: "Miércoles" },
    { key: "thursday", label: "Jueves" },
    { key: "friday", label: "Viernes" },
    { key: "saturday", label: "Sábado" },
    { key: "sunday", label: "Domingo" },
];

function getTodayKey(): string {
    const jsDay = new Date().getDay(); // 0=Sun, 1=Mon...
    const map = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return map[jsDay];
}

function ScheduleCardSkeleton() {
    return (
        <div className="flex gap-3 p-3 rounded-xl bg-secondary/40 animate-pulse">
            <div className="w-14 h-20 rounded-lg bg-secondary shrink-0" />
            <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-secondary rounded w-3/4" />
                <div className="h-3 bg-secondary rounded w-1/2" />
                <div className="h-3 bg-secondary rounded w-1/3" />
            </div>
        </div>
    );
}

export function WeeklySchedule() {
    const [selectedDay, setSelectedDay] = useState(getTodayKey);
    const [animes, setAnimes] = useState<ScheduleAnime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`/api/schedule?day=${selectedDay}`)
            .then((res) => res.json())
            .then((d) => {
                setAnimes(d.animes || []);
                setLoading(false);
            })
            .catch(() => {
                setError("Error al cargar el horario");
                setLoading(false);
            });
    }, [selectedDay]);

    const todayKey = getTodayKey();

    return (
        <div>
            <div className="flex items-center gap-2 mb-5">
                <Calendar size={20} className="text-primary" />
                <h2 className="text-xl sm:text-2xl font-semibold text-white">
                    Calendario Semanal
                </h2>
            </div>

            {/* Day tabs */}
            <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {DAYS.map((day) => (
                    <button
                        key={day.key}
                        onClick={() => setSelectedDay(day.key)}
                        className={`
              px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200
              ${selectedDay === day.key
                                ? "bg-primary text-white shadow-lg shadow-primary/25"
                                : day.key === todayKey
                                    ? "bg-primary/15 text-primary hover:bg-primary/25 ring-1 ring-primary/30"
                                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }
            `}
                    >
                        {day.label}
                        {day.key === todayKey && selectedDay !== day.key && (
                            <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {error ? (
                <p className="text-destructive text-center py-6">{error}</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {loading
                        ? Array.from({ length: 9 }).map((_, i) => (
                            <ScheduleCardSkeleton key={i} />
                        ))
                        : animes.map((anime) => (
                            <div
                                key={anime.mal_id}
                                className="flex gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/40 hover:border-primary/30 transition-all duration-200 group"
                            >
                                <div className="w-14 h-20 rounded-lg overflow-hidden bg-secondary shrink-0">
                                    <img
                                        src={anime.poster}
                                        alt={anime.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="flex-1 min-w-0 py-0.5">
                                    <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                        {anime.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-xs text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded">
                                            {anime.type}
                                        </span>
                                        {anime.score && anime.score > 0 && (
                                            <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                                                <Star size={10} className="fill-yellow-400" />
                                                {anime.score.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    {anime.broadcast_time && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Clock size={10} className="text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                {anime.broadcast_time} (JST)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {!loading && !error && animes.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                    No se encontraron animes para este día
                </p>
            )}
        </div>
    );
}
