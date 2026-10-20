import { createPublicClient, http, parseAbi } from "viem";
import {
  CHOG_GENESIS_ADDRESS,
  ERC721_ABI,
  MONAD_RPC,
} from "@/lib/monad";
import { fighterFromMetadata, fetchMetadata } from "@/lib/onchain-chog";
import type { ChogFighter } from "@/lib/chogs";

const client = createPublicClient({
  transport: http(MONAD_RPC),
});

const abi = parseAbi([
  ...ERC721_ABI,
  "function totalSupply() view returns (uint256)",
]);

export async function readTotalSupply(): Promise<number> {
  try {
    const n = await client.readContract({
      address: CHOG_GENESIS_ADDRESS,
      abi,
      functionName: "totalSupply",
    });
    return Number(n);
  } catch {
    return 1969;
  }
}

export async function loadFighterByTokenId(
  tokenId: number,
  source: "practice" | "onchain" = "onchain",
): Promise<ChogFighter> {
  if (!Number.isInteger(tokenId) || tokenId < 1) {
    throw new Error("Invalid tokenId");
  }
  try {
    const uri = await client.readContract({
      address: CHOG_GENESIS_ADDRESS,
      abi,
      functionName: "tokenURI",
      args: [BigInt(tokenId)],
    });
    const metadata = await fetchMetadata(uri);
    return fighterFromMetadata(tokenId, metadata, source);
  } catch {
    return fighterFromMetadata(
      tokenId,
      { name: `Chog #${tokenId}`, attributes: [] },
      source,
    );
  }
}

export async function ownerOfToken(tokenId: number): Promise<string | null> {
  try {
    const owner = await client.readContract({
      address: CHOG_GENESIS_ADDRESS,
      abi,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    });
    return owner;
  } catch {
    return null;
  }
}
