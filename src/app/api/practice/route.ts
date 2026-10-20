import { NextResponse } from "next/server";
import { PRACTICE_TOKEN_IDS } from "@/lib/chogs";
import {
  loadFighterByTokenId,
  MetadataLoadError,
  NO_STORE_HEADERS,
} from "@/lib/chog-loader";
import type { ChogFighter } from "@/lib/chogs";

export async function GET() {
  try {
    const settled = await Promise.allSettled(
      PRACTICE_TOKEN_IDS.map((id) => loadFighterByTokenId(id, "practice")),
    );
    const fighters: ChogFighter[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled") fighters.push(r.value);
    }
    if (fighters.length === 0) {
      throw new MetadataLoadError("Practice roster metadata unavailable");
    }
    return NextResponse.json(
      {
        label: "Practice — unranked",
        fighters,
        failed: PRACTICE_TOKEN_IDS.length - fighters.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Practice load failed";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
