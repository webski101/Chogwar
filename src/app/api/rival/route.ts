import { NextResponse } from "next/server";
import { pickRivalTokenId, todayKey } from "@/lib/chogs";
import { loadFighterByTokenId, readTotalSupply } from "@/lib/chog-loader";
import { secondsUntilNextUtcDay } from "@/lib/chogs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerTokenId = Number(searchParams.get("tokenId"));
  const day = searchParams.get("day") || todayKey();

  if (!Number.isInteger(playerTokenId) || playerTokenId < 1) {
    return NextResponse.json({ error: "tokenId required" }, { status: 400 });
  }

  try {
    const supply = await readTotalSupply();
    const rivalTokenId = pickRivalTokenId(playerTokenId, day, supply);
    const fighter = await loadFighterByTokenId(rivalTokenId, "onchain");
    return NextResponse.json(
      {
        day,
        playerTokenId,
        rivalTokenId,
        fighter,
        secondsUntilNextRival: secondsUntilNextUtcDay(),
        totalSupply: supply,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rival failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
