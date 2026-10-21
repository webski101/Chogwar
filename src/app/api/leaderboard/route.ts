import { NextResponse } from "next/server";
import { todayKey, secondsUntilNextUtcDay } from "@/lib/chogs";
import {
  entriesForTokens,
  storageMode,
  topEntries,
} from "@/lib/leaderboard-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const day = todayKey();
  const mine = searchParams.get("tokens");
  const tokenIds = mine
    ? mine
        .split(",")
        .map((t) => Number(t.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    : [];

  const mode = storageMode();
  if (mode === "offline") {
    return NextResponse.json({
      day,
      top: [],
      yours: [],
      secondsUntilNextRival: secondsUntilNextUtcDay(),
      storage: "offline",
      offline: true,
      message:
        "Ranked board: connect a wallet that holds a Chog — results verified on the server",
      hint:
        process.env.NODE_ENV === "development"
          ? "Dev: add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_*)"
          : undefined,
    });
  }

  const [top, yours] = await Promise.all([
    topEntries(day, 20),
    tokenIds.length ? entriesForTokens(day, tokenIds) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    day,
    top,
    yours,
    secondsUntilNextRival: secondsUntilNextUtcDay(),
    storage: mode,
    offline: false,
  });
}
