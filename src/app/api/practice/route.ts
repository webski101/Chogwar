import { NextResponse } from "next/server";
import { PRACTICE_TOKEN_IDS } from "@/lib/chogs";
import { loadFighterByTokenId } from "@/lib/chog-loader";

export async function GET() {
  try {
    const fighters = await Promise.all(
      PRACTICE_TOKEN_IDS.map((id) => loadFighterByTokenId(id, "practice")),
    );
    return NextResponse.json(
      {
        label: "Practice — unranked",
        fighters,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Practice load failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
