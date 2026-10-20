import type { Archetype, ChogStats } from "@/lib/chogs";

/** Real Genesis attribute bag (lowercase keys). */
export type AttrBag = Record<string, string>;

export type StatBonus = {
  label: string;
  power?: number;
  speed?: number;
  chaos?: number;
  grit?: number;
};

export type TraitBuild = {
  archetype: Archetype;
  stats: ChogStats;
  bonuses: StatBonus[];
  scores: Record<Archetype, number>;
};

/** Bases lowered ~8 vs prior to reduce 99 pile-up. */
const ARCHETYPE_BASE: Record<Archetype, ChogStats> = {
  chaos: { power: 58, speed: 62, chaos: 84, grit: 44 },
  tank: { power: 64, speed: 36, chaos: 38, grit: 86 },
  trickster: { power: 48, speed: 78, chaos: 72, grit: 42 },
  speed: { power: 52, speed: 86, chaos: 50, grit: 40 },
  brute: { power: 84, speed: 46, chaos: 54, grit: 60 },
};

const ARCHETYPES: Archetype[] = [
  "chaos",
  "tank",
  "trickster",
  "speed",
  "brute",
];

function lc(s: string | undefined) {
  return (s ?? "").toLowerCase().trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Exact value (case-insensitive). */
export function exact(hay: string, ...values: string[]) {
  const h = lc(hay);
  return values.some((v) => h === lc(v));
}

/**
 * Whole-word / phrase match. "horn" does not match "Horny Cap".
 * Short tokens like "wo" should use exact() instead.
 */
export function word(hay: string, ...needles: string[]) {
  const h = lc(hay);
  return needles.some((n) => {
    const needle = lc(n);
    if (!needle) return false;
    if (h === needle) return true;
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRe(needle)}(?:[^a-z0-9]|$)`, "i");
    return re.test(h);
  });
}

function hashTie(tokenId: number, seed: string): number {
  let h = tokenId >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function softCap(n: number): number {
  if (n <= 90) return n;
  return 90 + (n - 90) * 0.35;
}

function finalizeStat(n: number) {
  return Math.max(30, Math.min(99, Math.round(softCap(n))));
}

type ScoreBag = Record<Archetype, number>;

function blankScores(): ScoreBag {
  return { chaos: 0, tank: 0, trickster: 0, speed: 0, brute: 0 };
}

function addScore(scores: ScoreBag, arch: Archetype, pts: number) {
  scores[arch] += pts;
}

/**
 * Score-based archetype. Highest score wins; ties break by tokenId hash.
 * Tuned for ~15–25% each across a 300+ Genesis sample.
 */
export function scoreArchetypes(attrs: AttrBag): ScoreBag {
  const scores = blankScores();
  const eyes = attrs.eyes ?? "";
  const mouth = attrs.mouth ?? "";
  const head = attrs.head ?? "";
  const body = attrs.body ?? "";
  const skin = attrs.skin ?? "";
  const aura = attrs.aura ?? "";
  const base = attrs.base ?? "";
  const form = attrs.form ?? "";
  const tier = attrs.tier ?? "";
  const naked = attrs.naked ?? "";
  const accessory = attrs.accessory ?? "";
  const background = attrs.background ?? "";

  // --- Eyes ---
  // Lasers strongly favour Chaos (was under-assigned when Speed/Tank matched first).
  if (word(eyes, "fire laser", "purple laser", "green laser", "cyan laser", "laser")) {
    addScore(scores, "chaos", 14);
    addScore(scores, "brute", 3);
  } else if (word(eyes, "plasma visor", "plasma")) {
    // Plasma is flashy chaos/tech — do NOT force Speed.
    addScore(scores, "chaos", 6);
    addScore(scores, "trickster", 3);
  } else if (word(eyes, "anime glass")) {
    // Style eyes — slight trickster, not Speed lock.
    addScore(scores, "trickster", 4);
    addScore(scores, "chaos", 2);
  } else if (word(eyes, "modern vr", "vr", "retro glass", "btc glass")) {
    addScore(scores, "speed", 7);
  } else if (word(eyes, "angry", "thug", "dead")) {
    addScore(scores, "brute", 8);
  } else if (word(eyes, "side eye", "smirk", "mog", "xd")) {
    addScore(scores, "trickster", 8);
  } else if (word(eyes, "frog", "tired", "teary", "crying")) {
    addScore(scores, "trickster", 5);
    addScore(scores, "tank", 3);
  } else if (word(eyes, "heart", "happy")) {
    addScore(scores, "speed", 4);
  } else if (word(eyes, "viper", "mixed", "retard")) {
    addScore(scores, "chaos", 7);
  }

  // --- Mouth ---
  if (exact(mouth, "worried") || word(mouth, "flat", "grit")) {
    addScore(scores, "tank", 9);
  }
  if (word(mouth, "clown mouth", "clown")) {
    addScore(scores, "trickster", 8);
  }
  if (exact(mouth, "wo")) {
    addScore(scores, "trickster", 6);
  }
  if (word(mouth, "gold tooth", "btc coin", "mon coin", "drooling", "rainbow puke")) {
    addScore(scores, "brute", 7);
  }
  if (word(mouth, "lip bite", "bubblegum")) {
    addScore(scores, "trickster", 5);
  }
  if (word(mouth, "normal smile", "smile", "sad")) {
    addScore(scores, "tank", 3);
  }

  // --- Head (whole words: "horn" ≠ "Horny Cap") ---
  if (word(head, "crown", "spartan", "helmet", "russian", "plumber")) {
    addScore(scores, "tank", 8);
  }
  if (word(head, "horns", "horn", "void", "purple horn")) {
    addScore(scores, "brute", 8);
  }
  if (word(head, "jeet", "neet", "retard", "mmga", "mcga", "wagmi", "clown", "rainbow wig", "durag")) {
    addScore(scores, "trickster", 8);
  }
  if (word(head, "btc cap", "star cap", "dollar", "mon cap", "cloud", "10k tps")) {
    addScore(scores, "speed", 6);
  }
  if (word(head, "wizard", "beanie", "bucket")) {
    addScore(scores, "chaos", 3);
    addScore(scores, "trickster", 3);
  }

  // --- Body ---
  if (word(body, "inmate", "prisoner", "tank top", "squid")) {
    addScore(scores, "tank", 7);
  }
  if (word(body, "hoodie", "trackset", "jersey")) {
    addScore(scores, "speed", 5);
  }
  if (word(body, "glitch", "duck float", "banana", "six seven")) {
    addScore(scores, "trickster", 7);
  }
  if (word(body, "fire shirt", "electro", "gangster")) {
    addScore(scores, "brute", 5);
  }
  if (word(body, "tuxedo", "kings robe", "chinese")) {
    addScore(scores, "tank", 3);
    addScore(scores, "chaos", 2);
  }

  // --- Skin / aura / base / form / tier / naked ---
  if (word(skin, "yellow", "multi", "white", "jade")) {
    addScore(scores, "speed", 5);
  }
  if (word(skin, "black", "red")) {
    addScore(scores, "brute", 4);
  }
  if (word(skin, "pink")) {
    addScore(scores, "trickster", 3);
  }

  if (word(aura, "fiery", "burning", "fire", "smoke")) {
    addScore(scores, "brute", 7);
    addScore(scores, "chaos", 3);
  }
  if (word(aura, "wind", "aqua", "cool", "mint")) {
    addScore(scores, "speed", 6);
  }
  if (word(aura, "royal", "violet", "purple")) {
    addScore(scores, "chaos", 7);
  }

  if (word(base, "radioactive", "1:1")) {
    addScore(scores, "chaos", 10);
  }
  if (word(base, "skull") || word(form, "skull")) {
    addScore(scores, "brute", 8);
  }

  if (exact(tier, "legendary") || exact(tier, "epic")) {
    addScore(scores, "chaos", 6);
  } else if (exact(tier, "rare")) {
    addScore(scores, "chaos", 3);
  }

  if (exact(naked, "yes")) {
    addScore(scores, "chaos", 5);
  }

  // Accessories — small nudges
  if (word(accessory, "fwog", "heart")) {
    addScore(scores, "trickster", 4);
  }
  if (word(accessory, "cigar", "knife")) {
    addScore(scores, "brute", 4);
  }
  if (word(accessory, "red candle", "sb")) {
    addScore(scores, "chaos", 4);
  }
  if (word(accessory, "coin")) {
    addScore(scores, "speed", 3);
  }

  if (word(background, "radioactive", "void", "glitch")) {
    addScore(scores, "chaos", 3);
  }

  // Mild baseline so blank commons still diversify slightly
  addScore(scores, "tank", 1);
  addScore(scores, "speed", 1);
  addScore(scores, "brute", 1);
  addScore(scores, "trickster", 1);
  addScore(scores, "chaos", 1);

  return scores;
}

export function archetypeFromAttrs(attrs: AttrMap, tokenId = 0): Archetype {
  const scores = scoreArchetypes(attrs);
  let bestScore = -Infinity;
  for (const arch of ARCHETYPES) {
    bestScore = Math.max(bestScore, scores[arch]);
  }
  const tied = ARCHETYPES.filter((a) => scores[a] === bestScore);
  if (tied.length === 1) return tied[0];
  const seed = `${lc(attrs.eyes)}|${lc(attrs.mouth)}|${lc(attrs.head)}`;
  return tied[hashTie(tokenId, seed) % tied.length];
}

/** Build stats + human-readable bonus lines from real attributes. */
export function buildFromAttrs(attrs: AttrBag, tokenId: number): TraitBuild {
  const scores = scoreArchetypes(attrs);
  const archetype = archetypeFromAttrs(attrs, tokenId);
  const base = { ...ARCHETYPE_BASE[archetype] };
  const bonuses: StatBonus[] = [];

  const add = (label: string, delta: Partial<ChogStats>) => {
    bonuses.push({ label, ...delta });
    if (delta.power) base.power += delta.power;
    if (delta.speed) base.speed += delta.speed;
    if (delta.chaos) base.chaos += delta.chaos;
    if (delta.grit) base.grit += delta.grit;
  };

  const eyes = attrs.eyes ?? "";
  const mouth = attrs.mouth ?? "";
  const head = attrs.head ?? "";
  const body = attrs.body ?? "";
  const skin = attrs.skin ?? "";
  const aura = attrs.aura ?? "";
  const tier = attrs.tier ?? "Common";
  const baseTrait = attrs.base ?? "";
  const naked = attrs.naked ?? "No";
  const accessory = attrs.accessory ?? "";

  // Eyes
  if (word(eyes, "fire laser")) add("fire laser eyes +8 power", { power: 8 });
  else if (word(eyes, "purple laser"))
    add("Purple laser eyes +7 chaos", { chaos: 7 });
  else if (word(eyes, "green laser", "cyan laser"))
    add(`${eyes} +6 chaos`, { chaos: 6 });
  else if (word(eyes, "plasma visor", "plasma"))
    add("Plasma visor +5 chaos", { chaos: 5 });
  else if (word(eyes, "anime glass"))
    add("Anime Glass +4 chaos", { chaos: 4 });
  else if (word(eyes, "modern vr", "vr", "retro glass", "btc glass"))
    add(`${eyes} +6 speed`, { speed: 6 });
  else if (word(eyes, "angry", "thug")) add(`${eyes} +6 power`, { power: 6 });
  else if (word(eyes, "side eye", "smirk", "mog"))
    add(`${eyes} +5 chaos`, { chaos: 5 });
  else if (word(eyes, "frog", "tired", "teary", "crying"))
    add(`${eyes} +4 grit`, { grit: 4 });
  else if (word(eyes, "dead")) add("Dead eyes +5 chaos", { chaos: 5 });
  else if (word(eyes, "heart", "happy")) add(`${eyes} +3 speed`, { speed: 3 });

  // Mouth
  if (exact(mouth, "worried") || word(mouth, "flat"))
    add(`${mouth} mouth +8 grit`, { grit: 8 });
  else if (word(mouth, "clown")) add("Clown Mouth +6 chaos", { chaos: 6 });
  else if (word(mouth, "gold tooth", "btc coin", "mon coin"))
    add(`${mouth} +5 power`, { power: 5 });
  else if (word(mouth, "rainbow puke", "drooling"))
    add(`${mouth} +6 chaos`, { chaos: 6 });
  else if (exact(mouth, "wo")) add("wo +4 chaos", { chaos: 4 });
  else if (word(mouth, "lip bite", "bubblegum"))
    add(`${mouth} +4 chaos`, { chaos: 4 });
  else if (word(mouth, "normal smile", "smile"))
    add(`${mouth} +3 grit`, { grit: 3 });
  else if (word(mouth, "sad", "grit")) add(`${mouth} mouth +4 grit`, { grit: 4 });

  // Head
  if (word(head, "crown")) add("Crown +8 grit", { grit: 8 });
  else if (word(head, "spartan", "helmet")) add(`${head} +7 grit`, { grit: 7 });
  else if (word(head, "jeet", "neet", "retard", "mmga", "mcga", "wagmi"))
    add(`${head} +6 chaos`, { chaos: 6 });
  else if (word(head, "btc cap", "star cap", "dollar", "mon cap"))
    add(`${head} +5 speed`, { speed: 5 });
  else if (word(head, "wizard", "rainbow wig", "clown"))
    add(`${head} +5 chaos`, { chaos: 5 });
  else if (word(head, "horns", "horn", "void"))
    add(`${head} +6 power`, { power: 6 });
  else if (word(head, "russian", "plumber", "durag", "beanie", "bucket"))
    add(`${head} +4 grit`, { grit: 4 });
  else if (head) add(`${head} +2 grit`, { grit: 2 });

  // Body
  if (word(body, "tuxedo", "kings robe", "gangster", "chinese"))
    add(`${body} +4 grit`, { grit: 4 });
  else if (word(body, "hoodie", "trackset", "jersey"))
    add(`${body} +4 speed`, { speed: 4 });
  else if (word(body, "inmate", "prisoner", "squid"))
    add(`${body} +5 grit`, { grit: 5 });
  else if (word(body, "glitch", "duck", "banana", "six seven"))
    add(`${body} +5 chaos`, { chaos: 5 });
  else if (word(body, "fire shirt", "electro"))
    add(`${body} +4 power`, { power: 4 });

  // Skin / aura / base
  if (word(skin, "multi", "jade", "white"))
    add(`${skin} skin +5 speed`, { speed: 5 });
  else if (word(skin, "black", "red")) add(`${skin} skin +3 power`, { power: 3 });
  else if (word(skin, "pink", "yellow"))
    add(`${skin} skin +3 chaos`, { chaos: 3 });

  if (word(aura, "fiery", "burning", "fire"))
    add(`${aura} +6 power`, { power: 6 });
  else if (word(aura, "wind", "aqua", "cool", "mint"))
    add(`${aura} +5 speed`, { speed: 5 });
  else if (word(aura, "royal", "violet", "purple", "smoke"))
    add(`${aura} +5 chaos`, { chaos: 5 });
  else if (aura && !word(aura, "clean")) add(`${aura} +2 chaos`, { chaos: 2 });

  if (word(baseTrait, "radioactive", "1:1"))
    add(`${baseTrait} base +8 chaos`, { chaos: 8 });
  else if (word(baseTrait, "skull")) add("Skull base +6 power", { power: 6 });

  if (exact(naked, "yes")) add("Naked +4 chaos", { chaos: 4 });

  // Accessory small bonuses
  if (word(accessory, "fwog")) add("Fwog +3 chaos", { chaos: 3 });
  else if (word(accessory, "heart")) add("Heart +3 grit", { grit: 3 });
  else if (word(accessory, "cigar")) add("Cigar +3 power", { power: 3 });
  else if (word(accessory, "knife")) add("Knife +3 power", { power: 3 });
  else if (word(accessory, "red candle")) add("Red Candle +3 chaos", { chaos: 3 });
  else if (exact(accessory, "sb") || word(accessory, "sb"))
    add("SB +3 chaos", { chaos: 3 });
  else if (word(accessory, "coin")) add("Coin +3 speed", { speed: 3 });
  else if (accessory && !exact(accessory, "none", "no"))
    add(`${accessory} +2 grit`, { grit: 2 });

  // Tier bonuses (exact tier names)
  const tierBonus: Record<string, number> = {
    common: 0,
    uncommon: 3,
    rare: 6,
    epic: 9,
    legendary: 12,
  };
  const tb = tierBonus[lc(tier)] ?? 0;
  if (tb > 0) {
    add(`${tier} tier +${tb} all`, {
      power: tb,
      speed: tb,
      chaos: tb,
      grit: tb,
    });
  }

  // Tiny seed wobble so identical trait sets still differ by token
  const wobble = (offset: number) => ((tokenId * 17 + offset * 31) % 7) - 3;
  base.power += wobble(1);
  base.speed += wobble(2);
  base.chaos += wobble(3);
  base.grit += wobble(4);

  return {
    archetype,
    stats: {
      power: finalizeStat(base.power),
      speed: finalizeStat(base.speed),
      chaos: finalizeStat(base.chaos),
      grit: finalizeStat(base.grit),
    },
    bonuses,
    scores,
  };
}

/** Compact legacy traits object for move kits / UI chips. */
export function legacyTraitsFromAttrs(attrs: AttrBag) {
  return {
    eyes: attrs.eyes ?? "Unknown",
    mouth: attrs.mouth ?? "Unknown",
    fur: attrs.skin ?? attrs.base ?? "Unknown",
    vibe: attrs.tier ?? "Common",
    accessory: attrs.accessory ?? attrs.head ?? attrs.body ?? "None",
  };
}
