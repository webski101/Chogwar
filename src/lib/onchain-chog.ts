import type { ChogFighter } from "@/lib/chogs";
import { accentFor, displayName, fighterId } from "@/lib/chogs";
import { ipfsToHttp } from "@/lib/ipfs";
import {
  buildFromAttrs,
  legacyTraitsFromAttrs,
  type AttrBag,
} from "@/lib/traits";

export type NftAttribute = {
  trait_type: string;
  value: string | number;
};

export type ChogMetadata = {
  name?: string;
  description?: string;
  image?: string;
  attributes?: NftAttribute[];
};

export function attrMap(attributes: NftAttribute[] = []): AttrBag {
  const map: AttrBag = {};
  for (const a of attributes) {
    map[a.trait_type.toLowerCase()] = String(a.value);
  }
  return map;
}

/** True when metadata has real trait attributes (not empty / broken). */
export function hasRealTraits(metadata: ChogMetadata): boolean {
  const attrs = metadata.attributes;
  if (!attrs || attrs.length < 3) return false;
  const map = attrMap(attrs);
  // Need at least a couple of the core combat-facing traits
  const keys = ["eyes", "mouth", "head", "body", "skin", "tier"];
  const hit = keys.filter((k) => Boolean(map[k])).length;
  return hit >= 2;
}

export function fighterFromMetadata(
  tokenId: number,
  metadata: ChogMetadata,
  source: "practice" | "onchain" = "onchain",
): ChogFighter {
  if (!hasRealTraits(metadata)) {
    throw new Error(`No real traits for token ${tokenId}`);
  }
  const attrs = attrMap(metadata.attributes);
  const built = buildFromAttrs(attrs, tokenId);
  const metaName = metadata.name?.replace(/^CHOG\s*/i, "Chog ").trim();
  const name = displayName(tokenId);

  // Art id ≠ token id — never invent /{tokenId}.webp. Require metadata.image.
  const image = metadata.image ? ipfsToHttp(metadata.image) : undefined;

  return {
    id: fighterId(tokenId, source),
    tokenId,
    name,
    metaName: metaName && metaName !== name ? metaName : undefined,
    archetype: built.archetype,
    traits: legacyTraitsFromAttrs(attrs),
    stats: built.stats,
    bonuses: built.bonuses,
    accent: accentFor(tokenId),
    glow: "transparent",
    image,
    source,
    rawAttributes: attrs,
  };
}

/** @deprecated use fetchIpfsJson via chog-loader — kept for scripts */
export async function fetchMetadata(tokenURI: string): Promise<ChogMetadata> {
  const { fetchIpfsJson } = await import("@/lib/ipfs");
  return fetchIpfsJson<ChogMetadata>(tokenURI);
}
