import { NextResponse } from "next/server";
import { todayKey } from "@/lib/chogs";
import {
  entriesForTokens,
  storageMode,
  topEntries,
} from "@/lib/leaderboard-store";
import { secondsUntilNextUtcDay } from "@/lib/chogs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const day = searchParams.get("day") || todayKey();
  const mine = searchParams.get("tokens");
  const tokenIds = mine
    ? mine
        .split(",")
        .map((t) => Number(t.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    : [];

  const [top, yours] = await Promise.all([
    topEntries(day, 20),
    tokenIds.length ? entriesForTokens(day, tokenIds) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    day,
    top,
    yours,
    secondsUntilNextRival: secondsUntilNextUtcDay(),
    storage: storageMode(),
  });
}
