// Render stills and run the determinism + seam checks.
//   node tools/stills.mjs <out_dir> [name=time ...]      (no times: one still late in every beat, plus the loop seam)
import { chromium } from '../../liquid-chrome/tools/lib.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || '.');
fs.mkdirSync(out, { recursive: true });
const custom = process.argv.slice(3).map(a => a.split('='));
// --disable-partial-raster: Chrome otherwise re-rasters only the invalidated rectangles and keeps stale sub-pixel antialiasing elsewhere
const b = await chromium.launch({ args: ['--disable-partial-raster'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const open = async () => {
  const p = await ctx.newPage(); const logs = []; p.on('console', m => logs.push(m.text())); p.on('pageerror', e => logs.push('ERR ' + e.message));
  await p.goto('file://' + root + '/index.html'); await p.waitForFunction(() => window.__ready); p.logs = logs; return p;
};
let p = await open();
const LOOP = await p.evaluate(() => window.LOOP);
const beatT = await p.evaluate(() => Array.from({ length: 32 }, (_, i) => window.T(i + 1, 3)));
const times = custom.length ? Object.fromEntries(custom.map(([k, v]) => [k, +v])) : Object.fromEntries([
  ['b00_open', 0], ...beatT.map((t, i) => [`b${String(i + 1).padStart(2, '0')}`, t]), ['seam_last', LOOP - 1 / 60]]);
let n = 0;
for (const [name, t] of Object.entries(times)) {
  if (n++ % 8 === 0 && n > 1) { await p.close(); p = await open(); }
  await p.evaluate(t => window.renderAt(t), t);
  await p.screenshot({ path: path.join(out, `still-${name}.png`) });
}
await p.close(); p = await open();
await p.evaluate(() => window.seek(7.25)); const a = await p.screenshot();
await p.evaluate(() => { window.seek(3.1); window.seek(7.25); }); const c = await p.screenshot();
console.log('seek(7.25) twice identical:', Buffer.compare(a, c) === 0, p.logs.filter(l => !/Failed to load/.test(l)));
await b.close();
