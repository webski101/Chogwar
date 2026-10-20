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
};

const ARCHETYPE_BASE: Record<Archetype, ChogStats> = {
  chaos: { power: 66, speed: 70, chaos: 92, grit: 52 },
  tank: { power: 72, speed: 44, chaos: 46, grit: 94 },
  trickster: { power: 56, speed: 86, chaos: 80, grit: 50 },
  speed: { power: 60, speed: 94, chaos: 58, grit: 48 },
  brute: { power: 92, speed: 54, chaos: 62, grit: 68 },
};

function clamp(n: number, min = 30, max = 99) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function lc(s: string | undefined) {
  return (s ?? "").toLowerCase().trim();
}

function has(hay: string, ...needles: string[]) {
  const h = lc(hay);
  return needles.some((n) => h.includes(lc(n)));
}

/**
 * Archetype from real trait vocabulary.
 * Designed so all 5 show up across the collection (case-insensitive).
 */
export function archetypeFromAttrs(attrs: AttrBag): Archetype {
  const eyes = lc(attrs.eyes);
  const mouth = lc(attrs.mouth);
  const head = lc(attrs.head);
  const body = lc(attrs.body);
  const skin = lc(attrs.skin);
  const aura = lc(attrs.aura);
  const base = lc(attrs.base);
  const form = lc(attrs.form);
  const tier = lc(attrs.tier);

  // Tank — worried/flat mouths, helmets, heavy gear
  if (
    has(mouth, "worried", "flat", "grit") ||
    has(head, "spartan", "helmet", "russian", "plumber") ||
    has(body, "inmate", "prisoner", "tank top")
  ) {
    return "tank";
  }

  // Speed — visors, VR, neon/chrome skins, wind aura
  if (
    has(eyes, "visor", "vr", "anime glass", "retro glass", "btc glass") ||
    has(skin, "yellow", "multi", "white", "jade") ||
    has(aura, "wind", "aqua", "cool") ||
    has(head, "cloud", "10k tps")
  ) {
    return "speed";
  }

  // Brute — angry/gold tooth/puke, horns, fire aura, skull
  if (
    has(mouth, "gold tooth", "rainbow puke", "drooling", "btc coin") ||
    has(eyes, "angry", "thug", "dead") ||
    has(head, "horn", "void", "purple horn") ||
    has(aura, "fiery", "burning", "fire", "smoke") ||
    has(form, "skull") ||
    has(base, "skull")
  ) {
    return "brute";
  }

  // Trickster — clown/caps/memes/side-eye
  if (
    has(eyes, "side eye", "smirk", "mog", "xd", "frog", "heart", "tired") ||
    has(mouth, "clown", "bubblegum", "lip bite", "wo") ||
    has(head, "clown", "jeet", "neet", "retard", "mmga", "mcga", "wagmi", "durag", "rainbow wig") ||
    has(body, "duck float", "banana", "six seven", "glitch")
  ) {
    return "trickster";
  }

  // Chaos — lasers, legendary/epic, radioactive, naked yes
  if (
    has(eyes, "laser", "plasma", "viper", "retard", "mixed") ||
    has(tier, "legendary", "epic", "rare") ||
    has(base, "radioactive", "1:1") ||
    has(attrs.naked ?? "", "yes") ||
    has(aura, "royal", "violet", "purple")
  ) {
    return "chaos";
  }

  // Fallback by skin/eyes hash so commons still diversify
  const seed = `${eyes}|${mouth}|${head}|${skin}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const order: Archetype[] = ["chaos", "trickster", "speed", "brute", "tank"];
  return order[h % order.length];
}

/** Build stats + human-readable bonus lines from real attributes. */
export function buildFromAttrs(attrs: AttrBag, tokenId: number): TraitBuild {
  const archetype = archetypeFromAttrs(attrs);
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

  // Eyes
  if (has(eyes, "fire laser")) add("fire laser eyes +8 power", { power: 8 });
  else if (has(eyes, "purple laser")) add("Purple laser eyes +7 chaos", { chaos: 7 });
  else if (has(eyes, "green laser", "cyan laser"))
    add(`${eyes} +6 power`, { power: 6 });
  else if (has(eyes, "plasma")) add("Plasma visor +7 speed", { speed: 7 });
  else if (has(eyes, "visor", "vr")) add(`${eyes} +6 speed`, { speed: 6 });
  else if (has(eyes, "angry", "thug")) add(`${eyes} +6 power`, { power: 6 });
  else if (has(eyes, "side eye", "smirk", "mog"))
    add(`${eyes} +5 chaos`, { chaos: 5 });
  else if (has(eyes, "frog", "tired", "teary", "crying"))
    add(`${eyes} +4 grit`, { grit: 4 });
  else if (has(eyes, "dead")) add("Dead eyes +5 chaos", { chaos: 5 });
  else if (has(eyes, "heart", "happy")) add(`${eyes} +3 speed`, { speed: 3 });

  // Mouth
  if (has(mouth, "worried", "flat")) add(`${mouth} mouth +8 grit`, { grit: 8 });
  else if (has(mouth, "clown")) add("Clown Mouth +6 chaos", { chaos: 6 });
  else if (has(mouth, "gold tooth", "btc coin", "mon coin"))
    add(`${mouth} +5 power`, { power: 5 });
  else if (has(mouth, "rainbow puke", "drooling"))
    add(`${mouth} +6 chaos`, { chaos: 6 });
  else if (has(mouth, "wo", "lip bite", "bubblegum"))
    add(`${mouth} +4 chaos`, { chaos: 4 });
  else if (has(mouth, "normal smile", "smile"))
    add(`${mouth} +3 grit`, { grit: 3 });
  else if (has(mouth, "sad", "grit")) add(`${mouth} mouth +4 grit`, { grit: 4 });

  // Head
  if (has(head, "crown")) add("Crown +8 grit", { grit: 8 });
  else if (has(head, "spartan", "helmet")) add(`${head} +7 grit`, { grit: 7 });
  else if (has(head, "jeet", "neet", "retard", "mmga", "mcga", "wagmi"))
    add(`${head} +6 chaos`, { chaos: 6 });
  else if (has(head, "btc", "dollar", "mon cap", "star cap"))
    add(`${head} +5 speed`, { speed: 5 });
  else if (has(head, "wizard", "rainbow wig", "clown"))
    add(`${head} +5 chaos`, { chaos: 5 });
  else if (has(head, "horn", "void")) add(`${head} +6 power`, { power: 6 });
  else if (has(head, "russian", "plumber", "durag", "beanie", "bucket"))
    add(`${head} +4 grit`, { grit: 4 });
  else if (head) add(`${head} +2 grit`, { grit: 2 });

  // Body
  if (has(body, "tuxedo", "kings robe", "gangster", "chinese"))
    add(`${body} +4 grit`, { grit: 4 });
  else if (has(body, "hoodie", "trackset", "jersey"))
    add(`${body} +4 speed`, { speed: 4 });
  else if (has(body, "inmate", "prisoner", "squid"))
    add(`${body} +5 grit`, { grit: 5 });
  else if (has(body, "glitch", "duck", "banana", "six seven"))
    add(`${body} +5 chaos`, { chaos: 5 });
  else if (has(body, "fire shirt", "electro"))
    add(`${body} +4 power`, { power: 4 });

  // Skin / aura / base
  if (has(skin, "multi", "jade", "white")) add(`${skin} skin +5 speed`, { speed: 5 });
  else if (has(skin, "black", "red")) add(`${skin} skin +3 power`, { power: 3 });
  else if (has(skin, "pink", "yellow")) add(`${skin} skin +3 chaos`, { chaos: 3 });

  if (has(aura, "fiery", "burning", "fire")) add(`${aura} +6 power`, { power: 6 });
  else if (has(aura, "wind", "aqua", "cool", "mint"))
    add(`${aura} +5 speed`, { speed: 5 });
  else if (has(aura, "royal", "violet", "purple", "smoke"))
    add(`${aura} +5 chaos`, { chaos: 5 });
  else if (aura && !has(aura, "clean")) add(`${aura} +2 chaos`, { chaos: 2 });

  if (has(baseTrait, "radioactive", "1:1"))
    add(`${baseTrait} base +8 chaos`, { chaos: 8 });
  else if (has(baseTrait, "skull")) add("Skull base +6 power", { power: 6 });

  if (has(naked, "yes")) add("Naked +4 chaos", { chaos: 4 });

  // Tier bonuses (small but visible)
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
      power: clamp(base.power),
      speed: clamp(base.speed),
      chaos: clamp(base.chaos),
      grit: clamp(base.grit),
    },
    bonuses,
  };
}

/** Compact legacy traits object for move kits / UI chips. */
export function legacyTraitsFromAttrs(attrs: AttrBag) {
  return {
    eyes: attrs.eyes ?? "Unknown",
    mouth: attrs.mouth ?? "Unknown",
    fur: attrs.skin ?? attrs.base ?? "Unknown",
    vibe: attrs.tier ?? "Common",
    accessory: attrs.head ?? attrs.body ?? "None",
  };
}
