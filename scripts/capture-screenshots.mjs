/**
 * Capture README screenshots from production at 1440×900 (page only).
 * Mid-fight / result crop to #arena so pick-row "Why these stats" is gone.
 *
 *   SHOT_URL=https://chogwarr.vercel.app node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT = path.join(process.cwd(), "public/screenshots");
const BASE = process.env.SHOT_URL || "https://chogwarr.vercel.app";

fs.mkdirSync(OUT, { recursive: true });

async function waitImages(page, min = 2) {
  for (let i = 0; i < 45; i++) {
    const ok = await page.evaluate((n) => {
      const imgs = [...document.querySelectorAll("#arena img, #pick img")];
      return imgs.filter((img) => img.complete && img.naturalWidth > 40).length >= n;
    }, min);
    if (ok) return;
    await page.waitForTimeout(800);
  }
}

async function shotArena(page, file) {
  await page.locator("#arena").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  // Full viewport after scrolling arena to top — avoids pick-row fragment
  await page.evaluate(() => {
    const el = document.querySelector("#arena");
    if (el) el.scrollIntoView({ block: "start" });
    window.scrollBy(0, -8);
  });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(OUT, file),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log(file);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 90_000 });
  const sample = page.getByRole("button", { name: /sample holder/i });
  if (await sample.count()) await sample.click();

  await page.waitForSelector("text=Why these stats", { timeout: 120_000 });
  await waitImages(page, 3);

  await page.locator("#pick").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUT, "fighter-cards.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("fighter-cards.png");

  const enter = page.getByRole("button", { name: /enter the ring/i });
  await enter.waitFor({ timeout: 60_000 });
  await enter.click();
  await page.waitForTimeout(1200);
  await waitImages(page, 2);

  let wroteCrit = false;
  for (let round = 0; round < 16; round++) {
    if (await page.getByText(/take the ring|holds the ring/i).count()) break;
    const moves = page.locator("#arena button").filter({ hasText: /→/ });
    const n = await moves.count();
    if (n === 0) {
      await page.waitForTimeout(400);
      continue;
    }
    await moves.nth(round % n).click();
    await page.waitForTimeout(900);
    if ((await page.getByText(/CRIT/i).count()) && !wroteCrit) {
      await shotArena(page, "mid-fight-crit.png");
      wroteCrit = true;
    }
  }
  if (!wroteCrit) await shotArena(page, "mid-fight-crit.png");

  for (let i = 0; i < 16; i++) {
    if (await page.getByText(/take the ring|holds the ring/i).count()) break;
    const moves = page.locator("#arena button").filter({ hasText: /→/ });
    const n = await moves.count();
    if (n > 0) {
      await moves.nth(i % n).click();
      await page.waitForTimeout(800);
    } else break;
  }

  await page.getByText(/take the ring|holds the ring/i).waitFor({
    timeout: 45_000,
  });
  await waitImages(page, 2);
  await shotArena(page, "result-card.png");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
