import type { ChogFighter } from "./chogs";

export type BattleEvent = {
  round: number;
  actorId: string;
  actorName: string;
  targetName: string;
  move: string;
  damage: number;
  crit: boolean;
  text: string;
};

export type BattleResult = {
  winnerId: string;
  loserId: string;
  rounds: number;
  log: BattleEvent[];
  playerHpEnd: number;
  rivalHpEnd: number;
  seed: number;
};

const MOVES = {
  chaos: ["Chaos Spiral", "Meme Meteor", "Unhinged Yawn", "World Order Wiggle"],
  tank: ["Brick Wall", "Moss Guard", "Immovable Shrug", "Shield Bash"],
  trickster: ["Smoke Swap", "Pocket Sand", "Fake Out", "Prank Pivot"],
  speed: ["Blur Dash", "Rocket Skate", "Afterimage", "Zip Zap"],
  brute: ["Bat Swing", "Tooth Gap Headbutt", "Rage Stomp", "Brick Punch"],
} as const;

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(a: string, b: string, day: string) {
  const raw = `${a}|${b}|${day}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickMove(fighter: ChogFighter, rand: () => number) {
  const list = MOVES[fighter.archetype];
  return list[Math.floor(rand() * list.length)];
}

function attackPower(attacker: ChogFighter, defender: ChogFighter, rand: () => number) {
  const base =
    attacker.stats.power * 0.45 +
    attacker.stats.chaos * 0.25 +
    attacker.stats.speed * 0.15;
  const resist = defender.stats.grit * 0.35 + defender.stats.speed * 0.1;
  const swing = 0.85 + rand() * 0.35;
  const crit = rand() < attacker.stats.chaos / 400;
  let damage = Math.max(6, (base - resist) * swing);
  if (crit) damage *= 1.55;
  return { damage: Math.round(damage), crit };
}

export function simulateBattle(
  player: ChogFighter,
  rival: ChogFighter,
  dayKey: string,
): BattleResult {
  const seed = seedFrom(player.id, rival.id, dayKey);
  const rand = mulberry32(seed);

  let playerHp = 100;
  let rivalHp = 100;
  const log: BattleEvent[] = [];
  let round = 0;

  const playerFirst =
    player.stats.speed + rand() * 10 >= rival.stats.speed + rand() * 10;

  while (playerHp > 0 && rivalHp > 0 && round < 12) {
    round += 1;
    const order = playerFirst
      ? ([player, rival] as const)
      : ([rival, player] as const);

    for (const actor of order) {
      if (playerHp <= 0 || rivalHp <= 0) break;
      const target = actor.id === player.id ? rival : player;
      const move = pickMove(actor, rand);
      const { damage, crit } = attackPower(actor, target, rand);

      if (actor.id === player.id) {
        rivalHp = Math.max(0, rivalHp - damage);
      } else {
        playerHp = Math.max(0, playerHp - damage);
      }

      log.push({
        round,
        actorId: actor.id,
        actorName: actor.name,
        targetName: target.name,
        move,
        damage,
        crit,
        text: crit
          ? `${actor.name} lands a CRITICAL ${move} for ${damage}!`
          : `${actor.name} uses ${move} — ${damage} damage.`,
      });
    }
  }

  // Tie-break: higher remaining HP, then higher chaos
  let winnerId: string;
  let loserId: string;
  if (playerHp === rivalHp) {
    if (player.stats.chaos >= rival.stats.chaos) {
      winnerId = player.id;
      loserId = rival.id;
      log.push({
        round: round + 1,
        actorId: player.id,
        actorName: player.name,
        targetName: rival.name,
        move: "Chaos Tiebreak",
        damage: 0,
        crit: false,
        text: `Dead even — ${player.name}'s chaos edge steals the win.`,
      });
    } else {
      winnerId = rival.id;
      loserId = player.id;
      log.push({
        round: round + 1,
        actorId: rival.id,
        actorName: rival.name,
        targetName: player.name,
        move: "Chaos Tiebreak",
        damage: 0,
        crit: false,
        text: `Dead even — ${rival.name}'s chaos edge steals the win.`,
      });
    }
  } else if (playerHp > rivalHp) {
    winnerId = player.id;
    loserId = rival.id;
  } else {
    winnerId = rival.id;
    loserId = player.id;
  }

  return {
    winnerId,
    loserId,
    rounds: round,
    log,
    playerHpEnd: playerHp,
    rivalHpEnd: rivalHp,
    seed,
  };
}
