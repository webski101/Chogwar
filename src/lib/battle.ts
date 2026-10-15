import type { ChogFighter } from "./chogs";
import {
  maxHpFor,
  movesFor,
  resolveExchange,
  rivalPickMove,
  type Move,
} from "./moves";

export type BattleEvent = {
  round: number;
  actorId: string;
  actorName: string;
  targetName: string;
  move: string;
  damage: number;
  crit: boolean;
  text: string;
  playerMove?: string;
  rivalMove?: string;
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

export type LiveBattle = {
  seed: number;
  round: number;
  playerHp: number;
  rivalHp: number;
  playerMax: number;
  rivalMax: number;
  log: BattleEvent[];
  done: boolean;
  winnerId: string | null;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(a: string, b: string, day: string) {
  const raw = `${a}|${b}|${day}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createBattle(
  player: ChogFighter,
  rival: ChogFighter,
  dayKey: string,
): LiveBattle {
  return {
    seed: seedFrom(player.id, rival.id, dayKey),
    round: 0,
    playerHp: maxHpFor(player),
    rivalHp: maxHpFor(rival),
    playerMax: maxHpFor(player),
    rivalMax: maxHpFor(rival),
    log: [],
    done: false,
    winnerId: null,
  };
}

function decideWinner(
  player: ChogFighter,
  rival: ChogFighter,
  playerHp: number,
  rivalHp: number,
): string {
  if (playerHp <= 0 && rivalHp <= 0) {
    return player.stats.chaos >= rival.stats.chaos ? player.id : rival.id;
  }
  if (playerHp <= 0) return rival.id;
  if (rivalHp <= 0) return player.id;
  if (playerHp === rivalHp) {
    return player.stats.chaos >= rival.stats.chaos ? player.id : rival.id;
  }
  return playerHp > rivalHp ? player.id : rival.id;
}

/** Play one player-chosen turn. Rival answers with AI. */
export function playTurn(
  state: LiveBattle,
  player: ChogFighter,
  rival: ChogFighter,
  playerMove: Move,
): LiveBattle {
  if (state.done) return state;

  const rand = mulberry32(state.seed + state.round * 9973 + 13);
  const rivalMove = rivalPickMove(
    rival,
    state.rivalHp / state.rivalMax,
    state.playerHp / state.playerMax,
    rand,
  );

  const round = state.round + 1;
  const playerFirst =
    player.stats.speed + rand() * 8 >= rival.stats.speed + rand() * 8;

  let playerHp = state.playerHp;
  let rivalHp = state.rivalHp;
  const log = [...state.log];

  const acts = playerFirst
    ? ([
        { actor: player, move: playerMove, target: rival },
        { actor: rival, move: rivalMove, target: player },
      ] as const)
    : ([
        { actor: rival, move: rivalMove, target: player },
        { actor: player, move: playerMove, target: rival },
      ] as const);

  for (const step of acts) {
    if (playerHp <= 0 || rivalHp <= 0) break;
    const defenderMove =
      step.actor.id === player.id ? rivalMove : playerMove;
    const resolved = resolveExchange(
      step.actor,
      step.target,
      step.move,
      defenderMove,
      rand,
    );

    if (step.actor.id === player.id) {
      rivalHp = Math.max(0, rivalHp - resolved.damage);
    } else {
      playerHp = Math.max(0, playerHp - resolved.damage);
    }

    log.push({
      round,
      actorId: step.actor.id,
      actorName: step.actor.name,
      targetName: step.target.name,
      move: step.move.name,
      damage: resolved.damage,
      crit: resolved.crit,
      text: resolved.text,
      playerMove: playerMove.name,
      rivalMove: rivalMove.name,
    });
  }

  const maxRounds = 8;
  const done = playerHp <= 0 || rivalHp <= 0 || round >= maxRounds;
  const winnerId = done
    ? decideWinner(player, rival, playerHp, rivalHp)
    : null;

  if (done && playerHp > 0 && rivalHp > 0 && round >= maxRounds) {
    log.push({
      round: round + 1,
      actorId: winnerId!,
      actorName: winnerId === player.id ? player.name : rival.name,
      targetName: winnerId === player.id ? rival.name : player.name,
      move: "Decision",
      damage: 0,
      crit: false,
      text: "Time. Judges call it on remaining HP.",
    });
  }

  return {
    ...state,
    round,
    playerHp,
    rivalHp,
    log,
    done,
    winnerId,
  };
}

export function finishResult(
  state: LiveBattle,
  player: ChogFighter,
  rival: ChogFighter,
): BattleResult {
  const winnerId =
    state.winnerId ?? decideWinner(player, rival, state.playerHp, state.rivalHp);
  return {
    winnerId,
    loserId: winnerId === player.id ? rival.id : player.id,
    rounds: state.round,
    log: state.log,
    playerHpEnd: state.playerHp,
    rivalHpEnd: state.rivalHp,
    seed: state.seed,
  };
}

/** Auto-sim for tests / fallback — AI vs AI with player's first move bias. */
export function simulateBattle(
  player: ChogFighter,
  rival: ChogFighter,
  dayKey: string,
): BattleResult {
  let state = createBattle(player, rival, dayKey);
  const rand = mulberry32(state.seed);
  while (!state.done) {
    const move =
      movesFor(player)[Math.floor(rand() * 3)] ?? movesFor(player)[0];
    state = playTurn(state, player, rival, move);
  }
  return finishResult(state, player, rival);
}
