import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { todayKey } from "@/lib/chogs";
import { ownerOfToken } from "@/lib/chog-loader";
import { recordRankedResult } from "@/lib/leaderboard-store";

const SAMPLE_HOLDER = "0xfa30b6ecBc2038e349Aa41a45DBeb859B3a9D9aE".toLowerCase();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: string;
      tokenId?: number;
      won?: boolean;
      name?: string;
      dayKey?: string;
      message?: string;
      signature?: string;
      isSample?: boolean;
    };

    const address = body.address?.toLowerCase();
    const tokenId = Number(body.tokenId);
    const dayKey = body.dayKey || todayKey();

    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json({ error: "Valid address required" }, { status: 400 });
    }
    if (!Number.isInteger(tokenId) || tokenId < 1) {
      return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    }
    if (typeof body.won !== "boolean") {
      return NextResponse.json({ error: "won required" }, { status: 400 });
    }

    // Sample holder is view-only — never ranked
    if (body.isSample || address === SAMPLE_HOLDER) {
      return NextResponse.json(
        { error: "Sample holder is view-only — not ranked", ranked: false },
        { status: 403 },
      );
    }

    if (!body.message || !body.signature) {
      return NextResponse.json(
        { error: "Signed message required" },
        { status: 400 },
      );
    }

    const expectedPrefix = `Chog Rivalry ranked result\nDay: ${dayKey}\nToken: ${tokenId}\nWon: ${body.won}`;
    if (!body.message.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Bad message payload" }, { status: 400 });
    }

    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message: body.message,
      signature: body.signature as `0x${string}`,
    });
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const owner = await ownerOfToken(tokenId);
    if (!owner || owner.toLowerCase() !== address) {
      return NextResponse.json(
        { error: "Wallet does not own this Chog" },
        { status: 403 },
      );
    }

    const entry = await recordRankedResult({
      dayKey,
      tokenId,
      wallet: address,
      won: body.won,
      name: body.name || `Chog #${tokenId}`,
    });

    return NextResponse.json({ ok: true, ranked: true, entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
