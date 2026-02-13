import { NextResponse } from "next/server";
import { getHomePage } from "@/lib/animeflv";

export async function GET() {
    try {
        const data = await getHomePage();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Home fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch homepage data" },
            { status: 500 }
        );
    }
}
