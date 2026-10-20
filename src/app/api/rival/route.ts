import { NextResponse } from "next/server";
import { todayKey, secondsUntilNextUtcDay } from "@/lib/chogs";
import {
  loadDailyRival,
  MetadataLoadError,
  NO_STORE_HEADERS,
} from "@/lib/chog-loader";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerTokenId = Number(searchParams.get("tokenId"));
  const day = searchParams.get("day") || todayKey();

  if (!Number.isInteger(playerTokenId) || playerTokenId < 1) {
    return NextResponse.json(
      { error: "tokenId required" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const { rivalTokenId, fighter, totalSupply } = await loadDailyRival(
      playerTokenId,
      day,
    );
    return NextResponse.json(
      {
        day,
        playerTokenId,
        rivalTokenId,
        fighter,
        secondsUntilNextRival: secondsUntilNextUtcDay(),
        totalSupply,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof MetadataLoadError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Rival failed";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
