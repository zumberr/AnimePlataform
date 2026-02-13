import { NextResponse, NextRequest } from "next/server";

const JIKAN_BASE = "https://api.jikan.moe/v4";

const VALID_DAYS = [
    "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday"
];

interface JikanAnime {
    mal_id: number;
    title: string;
    images: {
        jpg: {
            image_url: string;
            large_image_url: string;
        };
    };
    type: string | null;
    score: number | null;
    broadcast: {
        time: string | null;
        string: string | null;
    } | null;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const day = searchParams.get("day")?.toLowerCase() || "monday";

    if (!VALID_DAYS.includes(day)) {
        return NextResponse.json(
            { error: "Invalid day. Use: " + VALID_DAYS.join(", ") },
            { status: 400 }
        );
    }

    try {
        const res = await fetch(
            `${JIKAN_BASE}/schedules?filter=${day}&sfw=true&limit=25`,
            { next: { revalidate: 3600 } }
        );

        if (!res.ok) {
            throw new Error(`Jikan API error: ${res.status}`);
        }

        const json = await res.json();
        const animes = (json.data || []).map((a: JikanAnime) => ({
            mal_id: a.mal_id,
            title: a.title,
            poster: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
            type: a.type || "TV",
            score: a.score,
            broadcast_time: a.broadcast?.time || null,
        }));

        return NextResponse.json({ day, animes });
    } catch (error) {
        console.error("Schedule fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch schedule data" },
            { status: 500 }
        );
    }
}
