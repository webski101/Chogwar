/**
 * Print archetype counts + stat histograms from cached metadata.
 *
 *   npx tsx scripts/trait-distribution.ts
 *
 * Expects JSON files in data/metadata/<tokenId>.json (from a prior sample).
 */
import fs from "node:fs";
import path from "node:path";
import { attrMap, type ChogMetadata } from "../src/lib/onchain-chog";
import { buildFromAttrs, archetypeFromAttrs } from "../src/lib/traits";
import type { Archetype } from "../src/lib/chogs";

const DIR = path.join(process.cwd(), "data/metadata");

type Row = {
  tokenId: number;
  archetype: Archetype;
  power: number;
  speed: number;
  chaos: number;
  grit: number;
  eyes: string;
};

function hist(values: number[], bucket = 5) {
  const bins = new Map<string, number>();
  for (const v of values) {
    const lo = Math.floor(v / bucket) * bucket;
    const key = `${lo}-${lo + bucket - 1}`;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  return [...bins.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error(`Missing ${DIR}. Sample metadata first.`);
    process.exit(1);
  }
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
  const rows: Row[] = [];
  let laserTotal = 0;
  let laserChaos = 0;

  for (const file of files) {
    const raw = JSON.parse(
      fs.readFileSync(path.join(DIR, file), "utf8"),
    ) as ChogMetadata & { tokenId?: number };
    // Snapshot files are named by art/metadata id (CID basename), not on-chain tokenId.
    const tokenId =
      raw.tokenId ?? Number(file.replace(/\.json$/, "")) ?? 0;
    const attrs = attrMap(raw.attributes);
    if (!attrs.eyes && !attrs.mouth) continue;
    const built = buildFromAttrs(attrs, tokenId);
    const arch = archetypeFromAttrs(attrs, tokenId);
    rows.push({
      tokenId,
      archetype: arch,
      power: built.stats.power,
      speed: built.stats.speed,
      chaos: built.stats.chaos,
      grit: built.stats.grit,
      eyes: attrs.eyes ?? "",
    });
    if (/laser/i.test(attrs.eyes ?? "")) {
      laserTotal += 1;
      if (arch === "chaos") laserChaos += 1;
    }
  }

  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.archetype] = (counts[r.archetype] ?? 0) + 1;

  console.log(`# Trait distribution (n=${rows.length})`);
  console.log("");
  console.log("## Archetypes");
  for (const [k, v] of Object.entries(counts).sort()) {
    const pct = ((v / rows.length) * 100).toFixed(1);
    console.log(`- ${k}: ${v} (${pct}%)`);
  }
  console.log("");
  console.log(
    `## Laser eyes → Chaos: ${laserChaos}/${laserTotal} (${
      laserTotal ? ((laserChaos / laserTotal) * 100).toFixed(1) : 0
    }%)`,
  );
  console.log("");
  for (const stat of ["power", "speed", "chaos", "grit"] as const) {
    const vals = rows.map((r) => r[stat]);
    const n99 = vals.filter((v) => v >= 99).length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    console.log(`## ${stat} (min ${min} max ${max}, n@99=${n99})`);
    for (const [bin, c] of hist(vals)) {
      console.log(`- ${bin}: ${c}`);
    }
    console.log("");
  }
}

main();
