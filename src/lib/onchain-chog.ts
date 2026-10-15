import type { Archetype, ChogFighter, ChogTraits } from "@/lib/chogs";
import { statsFromTraits } from "@/lib/chogs";
import { ipfsToHttp } from "@/lib/monad";

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

function attrMap(attributes: NftAttribute[] = []) {
  const map = new Map<string, string>();
  for (const a of attributes) {
    map.set(a.trait_type.toLowerCase(), String(a.value));
  }
  return map;
}

function pickArchetype(map: Map<string, string>): Archetype {
  const eyes = map.get("eyes") ?? "";
  const mouth = map.get("mouth") ?? "";
  const head = map.get("head") ?? "";
  const tier = map.get("tier") ?? "";
  const skin = map.get("skin") ?? "";

  if (/laser|rage|blood/i.test(eyes) || /legendary|mythic/i.test(tier)) {
    return "chaos";
  }
  if (/helmet|cap|crown|armor/i.test(head) || /worried|flat/i.test(mouth)) {
    return /worried|flat/i.test(mouth) ? "tank" : "trickster";
  }
  if (/gold|chrome|neon/i.test(skin)) return "speed";
  if (/angry|fangs|tooth|smirk/i.test(mouth)) return "brute";
  if (/star|halo|visor/i.test(head)) return "trickster";
  return "chaos";
}

function toLegacyTraits(map: Map<string, string>): ChogTraits {
  return {
    eyes: map.get("eyes") ?? "Unknown",
    mouth: map.get("mouth") ?? "Unknown",
    fur: map.get("skin") ?? map.get("base") ?? "Unknown",
    vibe: map.get("tier") ?? "Common",
    accessory: map.get("head") ?? map.get("background") ?? "None",
  };
}

const ACCENTS = ["#b8f000", "#5eead4", "#fb7185", "#fdba74", "#f87171", "#a3e635"];

function accentFor(tokenId: number) {
  return ACCENTS[tokenId % ACCENTS.length];
}

export function fighterFromMetadata(
  tokenId: number,
  metadata: ChogMetadata,
): ChogFighter {
  const map = attrMap(metadata.attributes);
  const archetype = pickArchetype(map);
  const traits = toLegacyTraits(map);
  const accent = accentFor(tokenId);
  return {
    id: `onchain-${tokenId}`,
    tokenId,
    name: metadata.name?.replace(/^CHOG/i, "Chog") ?? `Chog #${tokenId}`,
    archetype,
    traits,
    stats: statsFromTraits(archetype, traits, tokenId),
    accent,
    glow: `${accent}73`,
    image: metadata.image ? ipfsToHttp(metadata.image) : undefined,
    source: "onchain",
    rawAttributes: Object.fromEntries(map),
  };
}

export async function fetchMetadata(tokenURI: string): Promise<ChogMetadata> {
  const url = ipfsToHttp(tokenURI);
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Metadata fetch failed (${res.status})`);
  }
  return (await res.json()) as ChogMetadata;
}
