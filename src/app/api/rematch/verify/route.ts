import { createPublicClient, formatUnits, http, parseAbi } from "viem";
import { NextResponse } from "next/server";
import {
  CHOG_REMATCH_COST,
  CHOG_TOKEN_ADDRESS,
  ERC20_ABI,
  MONAD_RPC,
} from "@/lib/monad";

const client = createPublicClient({
  transport: http(MONAD_RPC),
});

const abi = parseAbi([...ERC20_ABI]);

/** Server-side $CHOG hold check at rematch unlock time. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Valid address required" }, { status: 400 });
  }

  try {
    const [raw, decimals, symbol] = await Promise.all([
      client.readContract({
        address: CHOG_TOKEN_ADDRESS,
        abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      }),
      client.readContract({
        address: CHOG_TOKEN_ADDRESS,
        abi,
        functionName: "decimals",
      }),
      client.readContract({
        address: CHOG_TOKEN_ADDRESS,
        abi,
        functionName: "symbol",
      }),
    ]);

    const whole = raw / BigInt(10) ** BigInt(decimals);
    const canRematch = whole >= CHOG_REMATCH_COST;

    return NextResponse.json({
      address,
      raw: raw.toString(),
      formatted: formatUnits(raw, decimals),
      whole: whole.toString(),
      decimals,
      symbol,
      canRematch,
      rematchCost: CHOG_REMATCH_COST.toString(),
      checkedAt: new Date().toISOString(),
      explanation: "1,000 $CHOG held → +1 rematch/day (hold-to-unlock, no transaction)",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verify failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
