import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { todayKey } from "@/lib/chogs";
import {
  isValidRivalTokenId,
  loadFighterByTokenId,
  ownerOfToken,
  readTotalSupply,
} from "@/lib/chog-loader";
import {
  consumeNonce,
  recordRankedResult,
  storageMode,
} from "@/lib/leaderboard-store";
import { replayRankedBattle } from "@/lib/replay-battle";

const SAMPLE_HOLDER =
  "0xfa30b6ecBc2038e349Aa41a45DBeb859B3a9D9aE".toLowerCase();

export async function POST(request: Request) {
  try {
    if (storageMode() === "offline") {
      return NextResponse.json(
        { error: "Ranked board unavailable", ranked: false, offline: true },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      address?: string;
      tokenId?: number;
      rivalTokenId?: number;
      name?: string;
      message?: string;
      signature?: string;
      isSample?: boolean;
      moves?: string[];
      nonce?: string;
    };

    const address = body.address?.toLowerCase();
    const tokenId = Number(body.tokenId);
    const rivalTokenId = Number(body.rivalTokenId);
    const dayKey = todayKey();
    const moves = Array.isArray(body.moves)
      ? body.moves.map(String).filter(Boolean)
      : [];
    const nonce = body.nonce?.trim();

    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json({ error: "Valid address required" }, { status: 400 });
    }
    if (!Number.isInteger(tokenId) || tokenId < 1) {
      return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    }
    if (!Number.isInteger(rivalTokenId) || rivalTokenId < 1) {
      return NextResponse.json({ error: "rivalTokenId required" }, { status: 400 });
    }
    if (!moves.length) {
      return NextResponse.json({ error: "moves required" }, { status: 400 });
    }
    if (!nonce) {
      return NextResponse.json({ error: "nonce required" }, { status: 400 });
    }

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

    const movesJoined = moves.join(",");
    const expected = `Chog Rivalry ranked result\nDay: ${dayKey}\nToken: ${tokenId}\nRival: ${rivalTokenId}\nNonce: ${nonce}\nMoves: ${movesJoined}`;
    if (body.message !== expected) {
      return NextResponse.json({ error: "Bad message payload" }, { status: 400 });
    }

    const supply = await readTotalSupply();
    if (!isValidRivalTokenId(tokenId, dayKey, rivalTokenId, supply)) {
      return NextResponse.json(
        { error: "Rival does not match today's deterministic pick" },
        { status: 400 },
      );
    }

    const nonceOk = await consumeNonce(address, dayKey, nonce);
    if (!nonceOk) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 401 },
      );
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

    const player = await loadFighterByTokenId(tokenId, "onchain");
    const rival = await loadFighterByTokenId(rivalTokenId, "onchain");
    const result = replayRankedBattle(player, rival, dayKey, moves);
    const won = result.winnerId === player.id;

    const entry = await recordRankedResult({
      dayKey,
      tokenId,
      wallet: address,
      won,
      name: body.name || player.name,
    });

    return NextResponse.json({
      ok: true,
      ranked: true,
      won,
      entry,
      rounds: result.rounds,
      rivalTokenId,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.length < 120
        ? error.message
        : "Submit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
