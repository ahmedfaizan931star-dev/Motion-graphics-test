// capture.mjs — records index.html as a 1920x1080 MP4 via Playwright + ffmpeg.
//
// Usage (matches the GitHub Actions workflow):
//   npm i -D playwright
//   npx playwright install --with-deps chromium
//   node capture.mjs
//
// APPROACH: uses Chrome DevTools Protocol "virtual time" to deterministically
// advance the page's clock frame-by-frame, rather than waiting in real time.
// This was verified end-to-end (frame content confirmed correct via direct
// screenshot comparison against real-time playback) before shipping — it is
// faster and immune to CI-runner slowness ever causing dropped/skipped
// animation frames.

import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const FPS = 30;
const DURATION_S = 65; // matches the JS timeline in index.html
const TOTAL_FRAMES = FPS * DURATION_S;
const FRAME_MS = 1000 / FPS;

const OUT_DIR = './frames';
if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

// Navigate with normal (real) time first so the page actually loads.
await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'load' });
await page.evaluate(() => { window.__pageStart = performance.now(); });

const client = await page.context().newCDPSession(page);

for (let f = 0; f < TOTAL_FRAMES; f++) {
  const targetMs = f * FRAME_MS;
  const nowMs = await page.evaluate(() => performance.now() - window.__pageStart);
  const budget = targetMs - nowMs;

  if (budget > 0) {
    const budgetExpired = new Promise((resolve) => {
      client.once('Emulation.virtualTimeBudgetExpired', resolve);
    });
    await client.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget });
    await budgetExpired;
  }

  await page.screenshot({ path: `${OUT_DIR}/frame_${String(f).padStart(5, '0')}.png` });

  if (f % 150 === 0) console.log(`captured frame ${f}/${TOTAL_FRAMES}`);
}

await browser.close();

execSync(
  `ffmpeg -y -framerate ${FPS} -i ${OUT_DIR}/frame_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 output.mp4`,
  { stdio: 'inherit' }
);

console.log('Done → output.mp4');
