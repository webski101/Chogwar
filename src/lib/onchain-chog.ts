import type { ChogFighter } from "@/lib/chogs";
import { accentFor, displayName, fighterId } from "@/lib/chogs";
import { artProxyPath, artIdFromUri } from "@/lib/ipfs";
import { buildFromAttrs, legacyTraitsFromAttrs } from "@/lib/traits";
import type { AttrBag } from "@/lib/traits";

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

/** Base "1:1" or Tier Legendary/Epic — may have only 2 attributes. */
export function isLegendaryOneOfOne(metadata: ChogMetadata): boolean {
  const map = attrMap(metadata.attributes ?? []);
  const base = (map.base ?? "").toLowerCase();
  const tier = (map.tier ?? "").toLowerCase();
  return (
    base.includes("1:1") ||
    exactTier(tier, "legendary") ||
    exactTier(tier, "epic")
  );
}

function exactTier(tier: string, want: string) {
  return tier.trim().toLowerCase() === want;
}

/** True when metadata has real trait attributes (not empty / broken). */
export function hasRealTraits(metadata: ChogMetadata): boolean {
  const attrs = metadata.attributes;
  if (!attrs?.length) return false;
  // Legendary / Epic 1:1s ship with Base + Tier only
  if (isLegendaryOneOfOne(metadata)) return true;
  if (attrs.length < 3) return false;
  const map = attrMap(attrs);
  const keys = ["eyes", "mouth", "head", "body", "skin", "tier"];
  const hit = keys.filter((k) => Boolean(map[k])).length;
  return hit >= 2;
}

/** "CHOG #1290 — Krown" → "Krown" */
export function oneOfOneTitleFromName(name?: string): string | undefined {
  if (!name) return undefined;
  const m = name.match(/[—–-]\s*(.+)$/);
  const title = m?.[1]?.trim();
  return title || undefined;
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
  const legendaryOneOfOne = isLegendaryOneOfOne(metadata);
  const oneOfOneTitle = legendaryOneOfOne
    ? oneOfOneTitleFromName(metadata.name)
    : undefined;

  // Art id ≠ token id — never invent /{tokenId}.webp. Proxy via /api/art.
  const artId = metadata.image ? artIdFromUri(metadata.image) : null;
  const image = artId != null ? artProxyPath(artId) : undefined;

  return {
    id: fighterId(tokenId, source),
    tokenId,
    name,
    metaName:
      !legendaryOneOfOne && metaName && metaName !== name
        ? metaName
        : undefined,
    oneOfOneTitle,
    legendaryOneOfOne,
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
