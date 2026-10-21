/**
 * Capture README screenshots from production at 1440×900 (page only).
 *   node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT = path.join(process.cwd(), "public/screenshots");
const BASE = process.env.SHOT_URL || "https://chogwarr.vercel.app";

fs.mkdirSync(OUT, { recursive: true });

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
  for (let i = 0; i < 40; i++) {
    const ok = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll("img")];
      return imgs.filter((img) => img.complete && img.naturalWidth > 40).length;
    });
    if (ok >= 3) break;
    await page.waitForTimeout(1000);
  }

  await page.locator("#pick").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  // Full viewport shot of fighter section
  await page.screenshot({
    path: path.join(OUT, "fighter-cards.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("fighter-cards.png");

  await page.locator("#arena").scrollIntoViewIfNeeded();
  const enter = page.getByRole("button", { name: /enter the ring/i });
  await enter.waitFor({ timeout: 60_000 });
  await enter.click();
  await page.waitForTimeout(1000);

  let wroteCrit = false;
  for (let round = 0; round < 12; round++) {
    if (await page.getByText(/take the ring|holds the ring/i).count()) break;
    const moves = page.locator("#arena button").filter({ hasText: /→/ });
    const n = await moves.count();
    if (n === 0) {
      await page.waitForTimeout(400);
      continue;
    }
    await moves.nth(round % n).click();
    await page.waitForTimeout(800);
    if ((await page.getByText(/CRIT/i).count()) && !wroteCrit) {
      await page.locator("#arena").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(OUT, "mid-fight-crit.png"),
        clip: { x: 0, y: 0, width: 1440, height: 900 },
      });
      wroteCrit = true;
      console.log("mid-fight-crit.png");
    }
  }
  if (!wroteCrit) {
    await page.screenshot({
      path: path.join(OUT, "mid-fight-crit.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    console.log("mid-fight-crit.png (fallback)");
  }

  for (let i = 0; i < 12; i++) {
    if (await page.getByText(/take the ring|holds the ring/i).count()) break;
    const moves = page.locator("#arena button").filter({ hasText: /→/ });
    const n = await moves.count();
    if (n > 0) {
      await moves.nth(i % n).click();
      await page.waitForTimeout(700);
    } else break;
  }

  await page.getByText(/take the ring|holds the ring/i).waitFor({
    timeout: 30_000,
  });
  await page.locator("#arena").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, "result-card.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("result-card.png");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
