import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/story');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});

const base = process.env.SHOT_BASE || 'http://127.0.0.1:4173';

async function shot(name, path, afterNav) {
  console.log('goto', path);
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3000);
  if (afterNav) await afterNav(page);
  const canvas = page.locator('canvas').first();
  if ((await canvas.count()) > 0) {
    await canvas.screenshot({ path: join(out, `${name}.png`) });
    console.log('saved canvas', name);
  } else {
    await page.screenshot({ path: join(out, `${name}.png`) });
    console.log('saved page', name);
  }
}

await shot('title', '/play/');

// Try start new game
try {
  // Title scene often uses Phaser canvas - click center-ish buttons via page text
  for (const lab of ['NEW GAME', 'New Game', 'START', '✦']) {
    const el = page.getByText(lab, { exact: false }).first();
    if ((await el.count()) > 0) {
      await el.click({ timeout: 2000 });
      await page.waitForTimeout(6000);
      console.log('clicked', lab);
      break;
    }
  }
  // Click center of canvas for title menu
  const box = await page.locator('canvas').first().boundingBox();
  if (box) {
    // Try lower-center where buttons often sit
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
    await page.waitForTimeout(4000);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.72);
    await page.waitForTimeout(5000);
  }
  await page.locator('canvas').first().screenshot({ path: join(out, 'after-click.png') });
  console.log('after-click');
} catch (e) {
  console.log('nav interact', e.message);
}

await shot('landing', '/');
await browser.close();
console.log('done');
