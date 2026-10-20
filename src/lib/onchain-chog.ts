import type { ChogFighter } from "@/lib/chogs";
import {
  accentFor,
  chogArtUrl,
  displayName,
  fighterId,
} from "@/lib/chogs";
import { ipfsToHttp } from "@/lib/monad";
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

export function fighterFromMetadata(
  tokenId: number,
  metadata: ChogMetadata,
  source: "practice" | "onchain" = "onchain",
): ChogFighter {
  const attrs = attrMap(metadata.attributes);
  const built = buildFromAttrs(attrs, tokenId);
  const metaName = metadata.name?.replace(/^CHOG\s*/i, "Chog ").trim();
  const name = displayName(tokenId);
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
    image: metadata.image ? ipfsToHttp(metadata.image) : chogArtUrl(tokenId),
    source,
    rawAttributes: attrs,
  };
}

export async function fetchMetadata(tokenURI: string): Promise<ChogMetadata> {
  const url = ipfsToHttp(tokenURI);
  const res = await fetch(url, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    throw new Error(`Metadata fetch failed (${res.status})`);
  }
  return (await res.json()) as ChogMetadata;
}
