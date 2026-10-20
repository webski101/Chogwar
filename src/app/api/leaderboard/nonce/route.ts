import { NextResponse } from "next/server";
import { todayKey } from "@/lib/chogs";
import { issueNonce, storageMode } from "@/lib/leaderboard-store";

/** Server-issued nonce for ranked submit signatures (bound to today UTC). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase();
  const dayKey = todayKey();

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Valid address required" }, { status: 400 });
  }

  if (storageMode() === "offline") {
    return NextResponse.json(
      { error: "Leaderboard offline", offline: true, dayKey },
      { status: 503 },
    );
  }

  const nonce = await issueNonce(address, dayKey);
  if (!nonce) {
    return NextResponse.json(
      { error: "Could not issue nonce", offline: true },
      { status: 503 },
    );
  }

  return NextResponse.json({
    dayKey,
    nonce,
    messageTemplate: `Chog Rivalry ranked result\nDay: ${dayKey}\nToken: <tokenId>\nNonce: ${nonce}\nMoves: <moveIds>`,
  });
}
