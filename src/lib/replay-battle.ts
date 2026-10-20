import {
  createBattle,
  finishResult,
  playTurn,
  type BattleResult,
} from "@/lib/battle";
import type { ChogFighter } from "@/lib/chogs";
import { movesFor } from "@/lib/moves";

/**
 * Replay a ranked fight from the player's move id list using the same
 * createBattle / playTurn seed path as the client.
 */
export function replayRankedBattle(
  player: ChogFighter,
  rival: ChogFighter,
  dayKey: string,
  moveIds: string[],
): BattleResult {
  if (!moveIds.length) {
    throw new Error("moves required");
  }
  const kit = movesFor(player);
  let state = createBattle(player, rival, dayKey);

  for (const moveId of moveIds) {
    if (state.done) break;
    const move = kit.find((m) => m.id === moveId);
    if (!move) {
      throw new Error(`Unknown move id: ${moveId}`);
    }
    state = playTurn(state, player, rival, move);
  }

  if (!state.done) {
    throw new Error("Fight incomplete — not enough moves");
  }

  return finishResult(state, player, rival);
}
