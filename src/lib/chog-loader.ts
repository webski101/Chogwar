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
import { loadBundledMetadata } from "@/lib/bundled-metadata";
import type { ChogFighter } from "@/lib/chogs";
import { pickRivalTokenId } from "@/lib/chogs";

const client = createPublicClient({
  transport: http(MONAD_RPC),
});

const abi = parseAbi([
  ...ERC721_ABI,
  "function totalSupply() view returns (uint256)",
]);

/** Max fall-through steps when daily rival metadata fails. */
export const RIVAL_FALLTHROUGH_MAX = 24;

export class MetadataLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetadataLoadError";
  }
}

function shortError(err: unknown, fallback: string): string {
  if (err instanceof MetadataLoadError) return err.message;
  if (err instanceof Error) {
    const m = err.message;
    // Strip verbose viem / RPC dumps
    if (m.length > 120 || /Details:|Version:|Request Arguments/i.test(m)) {
      return fallback;
    }
    return m;
  }
  return fallback;
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
    shortError(last, `Could not read tokenURI for #${tokenId}`),
  );
}

async function resolveMetadata(tokenURI: string): Promise<ChogMetadata> {
  const bundled = await loadBundledMetadata(tokenURI);
  if (bundled && hasRealTraits(bundled)) return bundled;
  return fetchIpfsJson<ChogMetadata>(tokenURI);
}

/**
 * Load a real Genesis fighter. Never returns a trait-less success —
 * throws MetadataLoadError after bundled + IPFS attempts.
 */
export async function loadFighterByTokenId(
  tokenId: number,
  source: "practice" | "onchain" = "onchain",
): Promise<ChogFighter> {
  if (!Number.isInteger(tokenId) || tokenId < 1) {
    throw new MetadataLoadError("Invalid tokenId");
  }

  try {
    const uri = await readTokenUri(tokenId);
    const metadata = await resolveMetadata(uri);

    if (!hasRealTraits(metadata)) {
      throw new MetadataLoadError(`No usable traits for #${tokenId}`);
    }

    return fighterFromMetadata(tokenId, metadata, source);
  } catch (err) {
    if (err instanceof MetadataLoadError) throw err;
    throw new MetadataLoadError(shortError(err, `Metadata unavailable for #${tokenId}`));
  }
}

/**
 * Ordered daily-rival candidates: deterministic pick, then +1 wrap,
 * skipping the player, up to RIVAL_FALLTHROUGH_MAX ids.
 */
export function rivalCandidateIds(
  playerTokenId: number,
  dayKey: string,
  totalSupply: number,
): number[] {
  const supply = Math.max(1, totalSupply);
  const start = pickRivalTokenId(playerTokenId, dayKey, supply);
  const out: number[] = [];
  let candidate = start;
  for (let i = 0; i < Math.min(supply, RIVAL_FALLTHROUGH_MAX); i++) {
    if (candidate !== playerTokenId && !out.includes(candidate)) {
      out.push(candidate);
    }
    candidate = candidate >= supply ? 1 : candidate + 1;
    if (candidate === playerTokenId) {
      candidate = candidate >= supply ? 1 : candidate + 1;
    }
  }
  return out;
}

/** True if rivalTokenId is the deterministic pick or a documented fall-through. */
export function isValidRivalTokenId(
  playerTokenId: number,
  dayKey: string,
  rivalTokenId: number,
  totalSupply: number,
): boolean {
  return rivalCandidateIds(playerTokenId, dayKey, totalSupply).includes(
    rivalTokenId,
  );
}

/** Deterministic rival: skip tokenIds whose metadata fails. */
export async function loadDailyRival(
  playerTokenId: number,
  dayKey: string,
  totalSupply?: number,
): Promise<{ rivalTokenId: number; fighter: ChogFighter; totalSupply: number }> {
  const supply = totalSupply ?? (await readTotalSupply());
  const candidates = rivalCandidateIds(playerTokenId, dayKey, supply);

  for (const candidate of candidates) {
    try {
      const fighter = await loadFighterByTokenId(candidate, "onchain");
      return { rivalTokenId: candidate, fighter, totalSupply: supply };
    } catch {
      /* try next fall-through */
    }
  }

  throw new MetadataLoadError("Could not load rival metadata");
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
