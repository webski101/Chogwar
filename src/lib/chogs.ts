import type { StatBonus } from "@/lib/traits";

export type Archetype = "chaos" | "tank" | "trickster" | "speed" | "brute";

export type ChogTraits = {
  eyes: string;
  mouth: string;
  fur: string;
  vibe: string;
  accessory: string;
};

export type ChogStats = {
  power: number;
  speed: number;
  chaos: number;
  grit: number;
};

export type ChogFighter = {
  id: string;
  tokenId: number;
  /** Always `Chog #<tokenId>` for identity. */
  name: string;
  /** On-chain metadata name if different (subtitle). */
  metaName?: string;
  archetype: Archetype;
  traits: ChogTraits;
  stats: ChogStats;
  bonuses: StatBonus[];
  accent: string;
  glow: string;
  image?: string;
  source?: "practice" | "onchain";
  rawAttributes?: Record<string, string>;
};

/** Genesis art CDN (Pinata). */
export const CHOG_IMAGE_CID =
  "bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e";

export const CHOG_TOTAL_SUPPLY = 1969;

/** Fixed practice roster tokenIds (real Genesis). */
export const PRACTICE_TOKEN_IDS = [
  20, 42, 100, 250, 500, 777, 888, 1200, 1500, 1800,
] as const;

export function chogArtUrl(assetId: number | string) {
  return `https://gateway.pinata.cloud/ipfs/${CHOG_IMAGE_CID}/${assetId}.webp`;
}

export function displayName(tokenId: number) {
  return `Chog #${tokenId}`;
}

export function fighterId(tokenId: number, source: "practice" | "onchain") {
  return source === "practice" ? `practice-${tokenId}` : `onchain-${tokenId}`;
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Deterministic daily rival tokenId in 1..totalSupply, excluding player's. */
export function pickRivalTokenId(
  playerTokenId: number,
  dayKey: string,
  totalSupply = CHOG_TOTAL_SUPPLY,
): number {
  let hash = 0;
  const key = `${playerTokenId}:${dayKey}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  // Map to 1..totalSupply
  let rival = (hash % totalSupply) + 1;
  if (rival === playerTokenId) {
    rival = rival === totalSupply ? 1 : rival + 1;
  }
  return rival;
}

/** Seconds until next UTC midnight (next daily rival). */
export function secondsUntilNextUtcDay(now = new Date()) {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(0, Math.floor((next - now.getTime()) / 1000));
}

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  chaos: "Chaos",
  tank: "Tank",
  trickster: "Trickster",
  speed: "Speed",
  brute: "Brute",
};

const ACCENTS = ["#e85d04", "#6b7c5e", "#d4a373", "#c45c4a", "#f3ebe2", "#8a7355"];

export function accentFor(tokenId: number) {
  return ACCENTS[tokenId % ACCENTS.length];
}
