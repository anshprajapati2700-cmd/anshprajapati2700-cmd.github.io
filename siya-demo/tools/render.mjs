// Render subframes at 1440x1440, 60 fps, LOOP * 60 frames (1200 for the 20 s loop), for motion blur.
//   node tools/render.mjs <sub_dir> <plan.json> <worker> <workers>     (frame f goes to worker f % workers)
// plan.json holds the subframe count per frame (tools/plan.py): 4 where little moves, 16 where it is fast.
// Subframe k of n samples t = (f + ((k + 0.5) / n - 0.5) * SHUTTER) / 60: a 180 degree shutter centred on the frame.
import { chromium } from '../../liquid-chrome/tools/lib.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sub = path.resolve(process.argv[2]);
const plan = process.argv[3] && fs.existsSync(process.argv[3]) ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
const worker = +process.argv[4] || 0, workers = +process.argv[5] || 1;
const FPS = 60, SHUTTER = 0.5, PAGE_SHOTS = 8;
fs.mkdirSync(sub, { recursive: true });
// --disable-partial-raster: Chrome otherwise re-rasters only the invalidated rectangles and keeps stale sub-pixel antialiasing elsewhere,
// so a frame's pixels would depend on which frames were drawn before it (the last frame then differed from the first at the window corners)
const b = await chromium.launch({ args: ['--disable-partial-raster'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1440 }, deviceScaleFactor: 1 });
const errs = [];
let n = 0;
const FRAMES = plan ? plan.length : Math.round((await (async () => { const p = await ctx.newPage(); await p.goto('file://' + root + '/index.html'); await p.waitForFunction(() => window.__ready); const l = await p.evaluate(() => window.LOOP); await p.close(); return l; })()) * FPS);
const open = async () => {
  // a fresh page every few shots: after roughly 30 consecutive screenshots in one page Chrome's output drifted by a few antialiased
  // corner pixels, which broke "last frame = first frame"; a few shots per page stays inside the range that was checked pixel-identical
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + root + '/index.html');
  await p.waitForFunction(() => window.__ready);
  return p;
};
for (let f = worker; f < FRAMES; f += workers) {
  const SUB = plan ? plan[f] : 4;
  let p = null;
  for (let k = 0; k < SUB; k++) {
    if (k % PAGE_SHOTS === 0) { if (p) await p.close(); p = await open(); }
    const t = (f + ((k + 0.5) / SUB - 0.5) * SHUTTER) / FPS;
    await p.evaluate(t => window.renderAt(t), t);
    const file = path.join(sub, `${String(f).padStart(5, '0')}_${k}.png`);
    if (!fs.existsSync(file)) await p.screenshot({ path: file });
  }
  await p.close();
  if (++n % 20 === 0) console.log(`worker ${worker}: ${n} frames, last ${f}`);
}
console.log(`worker ${worker} done`, errs);
await b.close();
