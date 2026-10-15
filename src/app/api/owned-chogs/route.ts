import { createPublicClient, http, parseAbi } from "viem";
import { NextResponse } from "next/server";
import {
  CHOG_GENESIS_ADDRESS,
  ERC721_ABI,
  MONAD_RPC,
} from "@/lib/monad";
import { fetchMetadata, fighterFromMetadata } from "@/lib/onchain-chog";

const client = createPublicClient({
  transport: http(MONAD_RPC),
});

const abi = parseAbi([...ERC721_ABI]);

const MAX_TOKENS = 12;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Valid address required" }, { status: 400 });
  }

  try {
    const tokens = await client.readContract({
      address: CHOG_GENESIS_ADDRESS,
      abi,
      functionName: "tokensOfOwner",
      args: [address as `0x${string}`],
    });

    const limited = tokens.slice(0, MAX_TOKENS);
    const fighters = await Promise.all(
      limited.map(async (tokenId) => {
        try {
          const uri = await client.readContract({
            address: CHOG_GENESIS_ADDRESS,
            abi,
            functionName: "tokenURI",
            args: [tokenId],
          });
          const metadata = await fetchMetadata(uri);
          return fighterFromMetadata(Number(tokenId), metadata);
        } catch {
          return fighterFromMetadata(Number(tokenId), {
            name: `Chog #${tokenId}`,
            attributes: [],
          });
        }
      }),
    );

    return NextResponse.json({
      address,
      count: tokens.length,
      truncated: tokens.length > MAX_TOKENS,
      fighters,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load NFTs";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
