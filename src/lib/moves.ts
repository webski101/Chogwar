import type { Archetype, ChogFighter } from "@/lib/chogs";

export type MoveKind = "strike" | "disrupt" | "guard";

export type Move = {
  id: string;
  name: string;
  kind: MoveKind;
  /** Base hit weight before stats. */
  power: number;
  blurb: string;
};

/** Strike > Disrupt > Guard > Strike */
export const KIND_BEATS: Record<MoveKind, MoveKind> = {
  strike: "disrupt",
  disrupt: "guard",
  guard: "strike",
};

const ARCHETYPE_MOVES: Record<Archetype, Move[]> = {
  chaos: [
    {
      id: "chaos-strike",
      name: "Chaos Spiral",
      kind: "strike",
      power: 78,
      blurb: "Wild swing powered by chaos.",
    },
    {
      id: "chaos-disrupt",
      name: "Meme Static",
      kind: "disrupt",
      power: 72,
      blurb: "Scramble their timing.",
    },
    {
      id: "chaos-guard",
      name: "Unhinged Shrug",
      kind: "guard",
      power: 64,
      blurb: "Tank the hit by not caring.",
    },
  ],
  tank: [
    {
      id: "tank-strike",
      name: "Shield Bash",
      kind: "strike",
      power: 70,
      blurb: "Slow, heavy contact.",
    },
    {
      id: "tank-disrupt",
      name: "Ground Stomp",
      kind: "disrupt",
      power: 66,
      blurb: "Shake their footing.",
    },
    {
      id: "tank-guard",
      name: "Brick Wall",
      kind: "guard",
      power: 86,
      blurb: "Absorb and shrug off damage.",
    },
  ],
  trickster: [
    {
      id: "trick-strike",
      name: "Pocket Sand",
      kind: "strike",
      power: 68,
      blurb: "Cheap shot while they blink.",
    },
    {
      id: "trick-disrupt",
      name: "Smoke Swap",
      kind: "disrupt",
      power: 80,
      blurb: "Break their read.",
    },
    {
      id: "trick-guard",
      name: "Fake Out",
      kind: "guard",
      power: 70,
      blurb: "Slip the blow, counter later.",
    },
  ],
  speed: [
    {
      id: "speed-strike",
      name: "Blur Dash",
      kind: "strike",
      power: 76,
      blurb: "Hit before they finish thinking.",
    },
    {
      id: "speed-disrupt",
      name: "Afterimage",
      kind: "disrupt",
      power: 74,
      blurb: "Make them swing at air.",
    },
    {
      id: "speed-guard",
      name: "Side Step",
      kind: "guard",
      power: 68,
      blurb: "Barely there when it lands.",
    },
  ],
  brute: [
    {
      id: "brute-strike",
      name: "Rage Swing",
      kind: "strike",
      power: 88,
      blurb: "All power, little polish.",
    },
    {
      id: "brute-disrupt",
      name: "Intimidate",
      kind: "disrupt",
      power: 62,
      blurb: "Force a bad decision.",
    },
    {
      id: "brute-guard",
      name: "Chin Check",
      kind: "guard",
      power: 60,
      blurb: "Take it on the chin and stay up.",
    },
  ],
};

export function movesFor(fighter: ChogFighter): Move[] {
  return ARCHETYPE_MOVES[fighter.archetype];
}

export function maxHpFor(fighter: ChogFighter): number {
  return Math.round(90 + fighter.stats.grit * 0.55);
}

function tierRank(tier: string): number {
  switch (tier.trim().toLowerCase()) {
    case "common":
      return 0;
    case "uncommon":
      return 1;
    case "rare":
      return 2;
    case "epic":
      return 3;
    case "legendary":
    case "mythic":
      return 4;
    default:
      return 0;
  }
}

/** Trait edge from real metadata (eyes / mouth / head / tier). */
export function traitEdge(attacker: ChogFighter, defender: ChogFighter): number {
  let edge = 1;
  const aEyes = (
    attacker.rawAttributes?.eyes ?? attacker.traits.eyes
  ).toLowerCase();
  const dMouth = (
    defender.rawAttributes?.mouth ?? defender.traits.mouth
  ).toLowerCase();
  const aHead = (
    attacker.rawAttributes?.head ?? attacker.traits.accessory
  ).toLowerCase();
  const aTier = (
    attacker.rawAttributes?.tier ?? attacker.traits.vibe
  ).toLowerCase();
  // Defender tier — never fall back to attacker's vibe
  const dTier = (
    defender.rawAttributes?.tier ?? defender.traits.vibe
  ).toLowerCase();

  if (
    /laser|rage|hypno|blood/.test(aEyes) &&
    /worried|smile|smirk|grin/.test(dMouth)
  ) {
    edge += 0.12;
  }
  if (/helmet|armor|cap|crown/.test(aHead)) edge += 0.06;

  const aRank = tierRank(aTier);
  const dRank = tierRank(dTier);
  if (aRank >= 2 && dRank === 0) edge += 0.1; // rare+ vs common
  if (aRank === 0 && dRank >= 3) edge -= 0.08; // common vs epic/legendary
  if (aRank === 3 && dRank <= 1) edge += 0.06; // epic vs common/uncommon

  return Math.max(0.85, Math.min(1.25, edge));
}

export function resolveExchange(
  attacker: ChogFighter,
  defender: ChogFighter,
  move: Move,
  defenderMove: Move,
  rand: () => number,
): { damage: number; crit: boolean; advantage: "win" | "lose" | "tie"; text: string } {
  let advantage: "win" | "lose" | "tie" = "tie";
  if (KIND_BEATS[move.kind] === defenderMove.kind) advantage = "win";
  else if (KIND_BEATS[defenderMove.kind] === move.kind) advantage = "lose";

  const offense =
    move.power * 0.55 +
    attacker.stats.power * 0.28 +
    attacker.stats.chaos * 0.12 +
    attacker.stats.speed * 0.08;
  const defense =
    defender.stats.grit * 0.42 +
    (defenderMove.kind === "guard" ? defenderMove.power * 0.22 : defenderMove.power * 0.08);

  let mult = traitEdge(attacker, defender);
  if (advantage === "win") mult *= 1.28;
  if (advantage === "lose") mult *= 0.72;

  const swing = 0.9 + rand() * 0.2;
  const critChance = attacker.stats.chaos / 380 + (advantage === "win" ? 0.08 : 0);
  const crit = rand() < critChance;
  if (crit) mult *= 1.45;

  const raw = Math.max(4, (offense - defense * 0.55) * mult * swing);
  const damage = Math.round(raw);

  const advText =
    advantage === "win"
      ? `${move.kind} beats ${defenderMove.kind}`
      : advantage === "lose"
        ? `${move.kind} loses to ${defenderMove.kind}`
        : "even clash";

  return {
    damage,
    crit,
    advantage,
    text: crit
      ? `${attacker.name} CRITS with ${move.name} (${advText}) — ${damage}`
      : `${attacker.name} uses ${move.name} (${advText}) — ${damage}`,
  };
}

export function rivalPickMove(
  rival: ChogFighter,
  rivalHpRatio: number,
  playerHpRatio: number,
  rand: () => number,
): Move {
  const moves = movesFor(rival);
  const weights = moves.map((m) => {
    let w = 1;
    if (m.kind === "guard" && rivalHpRatio < 0.35) w += 1.4;
    if (m.kind === "strike" && playerHpRatio < 0.4) w += 1.2;
    if (m.kind === "disrupt" && rival.archetype === "trickster") w += 0.8;
    if (m.kind === "strike" && rival.archetype === "brute") w += 0.9;
    if (m.kind === "guard" && rival.archetype === "tank") w += 0.9;
    if (m.kind === "disrupt" && rival.stats.chaos > 75) w += 0.5;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (let i = 0; i < moves.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return moves[i];
  }
  return moves[0];
}
