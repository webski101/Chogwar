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
  name: string;
  archetype: Archetype;
  traits: ChogTraits;
  stats: ChogStats;
  accent: string;
  glow: string;
  image?: string;
  source?: "demo" | "onchain";
  rawAttributes?: Record<string, string>;
};

/** Genesis art CDN (Pinata). On-chain metadata image paths use this CID. */
export const CHOG_IMAGE_CID =
  "bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e";

export function chogArtUrl(assetId: number | string) {
  return `https://gateway.pinata.cloud/ipfs/${CHOG_IMAGE_CID}/${assetId}.webp`;
}

const ARCHETYPE_BASE: Record<Archetype, ChogStats> = {
  chaos: { power: 68, speed: 72, chaos: 96, grit: 54 },
  tank: { power: 74, speed: 42, chaos: 48, grit: 98 },
  trickster: { power: 58, speed: 88, chaos: 82, grit: 52 },
  speed: { power: 62, speed: 98, chaos: 60, grit: 50 },
  brute: { power: 96, speed: 55, chaos: 64, grit: 70 },
};

function clamp(n: number, min = 30, max = 99) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function statsFromTraits(
  archetype: Archetype,
  traits: ChogTraits,
  seed: number,
): ChogStats {
  const base = ARCHETYPE_BASE[archetype];
  const wobble = (offset: number) => ((seed * 17 + offset * 31) % 13) - 6;

  let power = base.power + wobble(1);
  let speed = base.speed + wobble(2);
  let chaos = base.chaos + wobble(3);
  let grit = base.grit + wobble(4);

  if (traits.eyes.includes("Laser") || traits.eyes.includes("Rage")) power += 8;
  if (traits.mouth.includes("Grin") || traits.mouth.includes("Smirk")) chaos += 6;
  if (traits.fur.includes("Neon") || traits.fur.includes("Volt")) speed += 7;
  if (traits.vibe.includes("Menace") || traits.vibe.includes("Unhinged")) chaos += 10;
  if (traits.accessory.includes("Shield") || traits.accessory.includes("Helmet"))
    grit += 8;
  if (traits.accessory.includes("Rocket") || traits.accessory.includes("Skates"))
    speed += 8;
  if (traits.accessory.includes("Bat") || traits.accessory.includes("Fists"))
    power += 7;

  return {
    power: clamp(power),
    speed: clamp(speed),
    chaos: clamp(chaos),
    grit: clamp(grit),
  };
}

const DEMO_CHOGS_RAW: Omit<ChogFighter, "stats">[] = [
  {
    id: "chog-1969",
    tokenId: 1969,
    name: "Chog #1969",
    archetype: "chaos",
    traits: {
      eyes: "Laser Mischief",
      mouth: "Chaos Grin",
      fur: "Volt Lime",
      vibe: "Unhinged",
      accessory: "World Order Cap",
    },
    accent: "#e85d04",
    glow: "transparent",
    // Art asset ids from on-chain metadata (tokenId ≠ image index).
    image: chogArtUrl(1461),
  },
  {
    id: "chog-042",
    tokenId: 42,
    name: "Chog #42",
    archetype: "tank",
    traits: {
      eyes: "Stone Stare",
      mouth: "Flat Line",
      fur: "Slate Moss",
      vibe: "Immovable",
      accessory: "Shield Plate",
    },
    accent: "#6b7c5e",
    glow: "transparent",
    image: chogArtUrl(1503),
  },
  {
    id: "chog-777",
    tokenId: 777,
    name: "Chog #777",
    archetype: "trickster",
    traits: {
      eyes: "Sideways Glance",
      mouth: "Smirk",
      fur: "Ink Black",
      vibe: "Scheming",
      accessory: "Smoke Bomb",
    },
    accent: "#d4a373",
    glow: "transparent",
    image: chogArtUrl(269),
  },
  {
    id: "chog-301",
    tokenId: 301,
    name: "Chog #301",
    archetype: "speed",
    traits: {
      eyes: "Wide Alert",
      mouth: "Open Yell",
      fur: "Neon Peach",
      vibe: "Restless",
      accessory: "Rocket Skates",
    },
    accent: "#c45c4a",
    glow: "transparent",
    image: chogArtUrl(1762),
  },
  {
    id: "chog-888",
    tokenId: 888,
    name: "Chog #888",
    archetype: "brute",
    traits: {
      eyes: "Rage Rings",
      mouth: "Tooth Gap",
      fur: "Brick Red",
      vibe: "Menace",
      accessory: "Chaos Bat",
    },
    accent: "#e85d04",
    glow: "transparent",
    image: chogArtUrl(380),
  },
  {
    id: "chog-113",
    tokenId: 113,
    name: "Chog #113",
    archetype: "chaos",
    traits: {
      eyes: "Spiral Hypno",
      mouth: "Tongue Out",
      fur: "Mint Static",
      vibe: "Prank Mode",
      accessory: "Whoopie Cushion",
    },
    accent: "#6b7c5e",
    glow: "transparent",
    image: chogArtUrl(1574),
  },
];

export const DEMO_CHOGS: ChogFighter[] = DEMO_CHOGS_RAW.map((chog) => ({
  ...chog,
  stats: statsFromTraits(chog.archetype, chog.traits, chog.tokenId),
  source: "demo" as const,
}));

export function getChogById(id: string) {
  return DEMO_CHOGS.find((c) => c.id === id);
}

export function pickRival(playerId: string, dayKey: string): ChogFighter {
  const pool = DEMO_CHOGS.filter((c) => c.id !== playerId);
  let hash = 0;
  const key = `${playerId}:${dayKey}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  chaos: "Chaos",
  tank: "Tank",
  trickster: "Trickster",
  speed: "Speed",
  brute: "Brute",
};
