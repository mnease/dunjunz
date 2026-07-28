/**
 * Export armored player paperdoll PNG for the website.
 * Uses real drawPlayerLook via Vite + Playwright.
 *
 *   node scripts/export-paperdoll.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public');
const outPath = join(outDir, 'paperdoll-armored.png');

mkdirSync(outDir, { recursive: true });

const server = await createServer({
  root,
  server: { port: 5199, strictPort: true },
  logLevel: 'warn',
});
await server.listen();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 600, height: 600 },
  deviceScaleFactor: 1,
});

try {
  await page.goto('http://127.0.0.1:5199/tools/paperdoll.html', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__paperdollReady === true, {
    timeout: 30000,
  });
  // Transparent page; screenshot canvas only
  const canvas = page.locator('#out');
  await canvas.screenshot({ path: outPath, omitBackground: true });
  console.log('wrote', outPath);
} finally {
  await browser.close();
  await server.close();
}
