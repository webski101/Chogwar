/**
 * Simulate random-move duels and report round-length percentiles.
 *
 *   npx tsx scripts/fight-length.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createBattle, playTurn } from "@/lib/battle";
import { movesFor } from "@/lib/moves";
import {
  fighterFromMetadata,
  hasRealTraits,
  type ChogMetadata,
} from "@/lib/onchain-chog";
import type { ChogFighter } from "@/lib/chogs";

const DIR = path.join(process.cwd(), "data/metadata");
const SIMS_PER_PAIR = 300;
const PAIR_COUNT = 8;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((p / 100) * (sorted.length - 1))),
  );
  return sorted[idx];
}

function loadFighters(n: number): ChogFighter[] {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => Number(a.replace(".json", "")) - Number(b.replace(".json", "")));
  const out: ChogFighter[] = [];
  for (const file of files) {
    if (out.length >= n) break;
    const raw = JSON.parse(
      fs.readFileSync(path.join(DIR, file), "utf8"),
    ) as ChogMetadata;
    if (!hasRealTraits(raw)) continue;
    // Use art file id as stand-in tokenId for sim (stats still from traits)
    const tokenId = Number(file.replace(".json", ""));
    try {
      out.push(fighterFromMetadata(tokenId, raw, "onchain"));
    } catch {
      /* skip */
    }
  }
  return out;
}

function simulateRounds(a: ChogFighter, b: ChogFighter, seed: number): number {
  let battle = createBattle(a, b, `sim-${seed}`);
  const moves = movesFor(a);
  let guard = 0;
  while (!battle.done && guard < 40) {
    const move = moves[Math.floor(Math.random() * moves.length)];
    battle = playTurn(battle, a, b, move);
    guard += 1;
  }
  return battle.round;
}

function main() {
  const pool = loadFighters(40);
  if (pool.length < 4) {
    console.error("Need more fighters in data/metadata");
    process.exit(1);
  }

  const allRounds: number[] = [];
  console.log(`Pool ${pool.length} fighters · ${PAIR_COUNT} pairs × ${SIMS_PER_PAIR} sims\n`);

  for (let p = 0; p < PAIR_COUNT; p++) {
    const a = pool[p % pool.length];
    const b = pool[(p * 7 + 3) % pool.length];
    if (a.tokenId === b.tokenId) continue;
    const rounds: number[] = [];
    for (let i = 0; i < SIMS_PER_PAIR; i++) {
      rounds.push(simulateRounds(a, b, p * 10_000 + i));
    }
    rounds.sort((x, y) => x - y);
    allRounds.push(...rounds);
    console.log(
      `${a.name} vs ${b.name}: median=${percentile(rounds, 50)} p10=${percentile(rounds, 10)} p90=${percentile(rounds, 90)} (n=${rounds.length})`,
    );
  }

  allRounds.sort((x, y) => x - y);
  const median = percentile(allRounds, 50);
  const p10 = percentile(allRounds, 10);
  const p90 = percentile(allRounds, 90);
  console.log("\n=== Aggregate ===");
  console.log(`n=${allRounds.length} median=${median} p10=${p10} p90=${p90}`);
  console.log(
    `\nREADME blurb:\nRandom-move duel length (DAMAGE_SCALE=0.4): median ${median} rounds (p10 ${p10} / p90 ${p90}) across ${allRounds.length} sims.`,
  );
}

main();
