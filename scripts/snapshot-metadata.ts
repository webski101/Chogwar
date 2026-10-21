/**
 * One-off: slowly fetch all 1,969 Genesis metadata JSON files from the
 * collection CID into data/metadata/<id>.json
 *
 *   npx tsx scripts/snapshot-metadata.ts
 */
import fs from "node:fs";
import path from "node:path";

const CID = "bafybeid4ybujnscdipkno7ps5utqelp5ry5ryreqhay3zhgk3a6x4jruqu";
const TOTAL = 1969;
const OUT = path.join(process.cwd(), "data/metadata");
const GATEWAYS = [
  (id: number) => `https://gateway.pinata.cloud/ipfs/${CID}/${id}.json`,
  (id: number) => `https://dweb.link/ipfs/${CID}/${id}.json`,
];

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchOne(id: number): Promise<object> {
  let last = "";
  for (const g of GATEWAYS) {
    try {
      const res = await fetch(g(id), { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) {
        last = String(res.status);
        continue;
      }
      return (await res.json()) as object;
    } catch (e) {
      last = e instanceof Error ? e.message : "fail";
    }
  }
  throw new Error(last || "fetch failed");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  let skip = 0;
  let fail = 0;

  // Slow: 4 concurrent, ~250ms between batches
  for (let start = 1; start <= TOTAL; start += 4) {
    const batch: number[] = [];
    for (let id = start; id < start + 4 && id <= TOTAL; id++) batch.push(id);

    await Promise.all(
      batch.map(async (id) => {
        const dest = path.join(OUT, `${id}.json`);
        if (fs.existsSync(dest)) {
          const st = fs.statSync(dest);
          if (st.size > 80) {
            skip += 1;
            return;
          }
        }
        try {
          const meta = await fetchOne(id);
          fs.writeFileSync(dest, JSON.stringify(meta));
          ok += 1;
        } catch {
          fail += 1;
        }
      }),
    );

    const done = Math.min(start + 3, TOTAL);
    process.stdout.write(`\r${done}/${TOTAL} ok=${ok} skip=${skip} fail=${fail}`);
    await sleep(250);
  }
  console.log(`\nDone. ok=${ok} skip=${skip} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
