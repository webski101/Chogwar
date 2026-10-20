import { createPublicClient, http, parseAbi } from "viem";
import {
  CHOG_GENESIS_ADDRESS,
  ERC721_ABI,
  MONAD_RPC,
} from "@/lib/monad";
import {
  fighterFromMetadata,
  hasRealTraits,
  type ChogMetadata,
} from "@/lib/onchain-chog";
import { fetchIpfsJson } from "@/lib/ipfs";
import type { ChogFighter } from "@/lib/chogs";
import { pickRivalTokenId } from "@/lib/chogs";

const client = createPublicClient({
  transport: http(MONAD_RPC),
});

const abi = parseAbi([
  ...ERC721_ABI,
  "function totalSupply() view returns (uint256)",
]);

export class MetadataLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetadataLoadError";
  }
}

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

async function readTokenUri(tokenId: number): Promise<string> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await client.readContract({
        address: CHOG_GENESIS_ADDRESS,
        abi,
        functionName: "tokenURI",
        args: [BigInt(tokenId)],
      });
    } catch (err) {
      last = err;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }
  throw new MetadataLoadError(
    `tokenURI failed for #${tokenId}: ${
      last instanceof Error ? last.message : "rpc error"
    }`,
  );
}

/**
 * Load a real Genesis fighter. Never returns a trait-less success —
 * throws MetadataLoadError after retries / gateway failover.
 */
export async function loadFighterByTokenId(
  tokenId: number,
  source: "practice" | "onchain" = "onchain",
): Promise<ChogFighter> {
  if (!Number.isInteger(tokenId) || tokenId < 1) {
    throw new MetadataLoadError("Invalid tokenId");
  }

  const uri = await readTokenUri(tokenId);
  const metadata = await fetchIpfsJson<ChogMetadata>(uri);

  if (!hasRealTraits(metadata)) {
    throw new MetadataLoadError(
      `Metadata for #${tokenId} has no usable attributes`,
    );
  }

  return fighterFromMetadata(tokenId, metadata, source);
}

/** Deterministic rival: skip tokenIds whose metadata fails. */
export async function loadDailyRival(
  playerTokenId: number,
  dayKey: string,
  totalSupply?: number,
): Promise<{ rivalTokenId: number; fighter: ChogFighter; totalSupply: number }> {
  const supply = totalSupply ?? (await readTotalSupply());
  const tried = new Set<number>();
  let candidate = pickRivalTokenId(playerTokenId, dayKey, supply);

  for (let i = 0; i < Math.min(supply, 24); i++) {
    if (!tried.has(candidate) && candidate !== playerTokenId) {
      tried.add(candidate);
      try {
        const fighter = await loadFighterByTokenId(candidate, "onchain");
        return { rivalTokenId: candidate, fighter, totalSupply: supply };
      } catch {
        /* try next */
      }
    }
    candidate = candidate >= supply ? 1 : candidate + 1;
    if (candidate === playerTokenId) {
      candidate = candidate >= supply ? 1 : candidate + 1;
    }
  }

  throw new MetadataLoadError("Could not load any rival metadata");
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

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;
