// capture.mjs — records index.html as a 1920x1080 MP4 via Playwright + ffmpeg.
// Usage:
//   npm i -D playwright
//   npx playwright install --with-deps chromium
//   node capture.mjs
//
// Produces frames/ (PNG sequence) then stitches to output.mp4 via ffmpeg.
// This pattern drops straight into a GitHub Actions job if you want it
// to run in CI instead of locally.

import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const FPS = 30;
const DURATION_S = 65; // matches the JS timeline in index.html
const TOTAL_FRAMES = FPS * DURATION_S;

const OUT_DIR = './frames';
if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

// Load the file, then freeze real time and drive a virtual clock instead,
// so every frame renders deterministically regardless of capture speed.
await page.goto('file://' + process.cwd() + '/index.html');

// Pause CSS/WAAPI-driven time and step it manually per frame.
await page.evaluate(() => {
  document.getAnimations().forEach(a => a.pause());
  window.__t0 = performance.now();
});

for (let f = 0; f < TOTAL_FRAMES; f++) {
  const ms = (f / FPS) * 1000;
  await page.evaluate((ms) => {
    document.getAnimations().forEach(a => { a.currentTime = ms; });
  }, ms);
  await page.screenshot({ path: `${OUT_DIR}/frame_${String(f).padStart(5,'0')}.png` });
}

await browser.close();

execSync(
  `ffmpeg -y -framerate ${FPS} -i ${OUT_DIR}/frame_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 output.mp4`,
  { stdio: 'inherit' }
);

console.log('Done → output.mp4');
