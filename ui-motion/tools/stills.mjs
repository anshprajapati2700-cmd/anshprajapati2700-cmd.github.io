// Render stills of named moments (or a list of times) and run the determinism + seam checks.
//   node tools/stills.mjs <out_dir> [name=time ...]
import { chromium } from '../../liquid-chrome/tools/lib.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || '.');
fs.mkdirSync(out, { recursive: true });
const custom = process.argv.slice(3).map(a => a.split('='));
// --disable-partial-raster: Chrome otherwise re-rasters only the invalidated rectangles and keeps stale sub-pixel antialiasing elsewhere,
// so a frame's pixels would depend on which frames were drawn before it (the last frame then differed from the first at the window corners)
const b = await chromium.launch({ args: ['--disable-partial-raster'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1440 }, deviceScaleFactor: 1 })).newPage();
const logs = []; p.on('console', m => logs.push(m.text())); p.on('pageerror', e => logs.push('ERR ' + e.message));
await p.goto('file://' + root + '/index.html');
await p.waitForFunction(() => window.__ready);
const T = (b, q = 0) => p.evaluate(([b, q]) => window.T(b, q), [b, q]);
const times = custom.length ? Object.fromEntries(custom.map(([k, v]) => [k, +v])) : {
  A_opening: 0, B_button_loader: await T(4, 3), C_check: await T(5, 3), D_row_in: await T(6, 3), E_panel_typing: await T(8, 3),
  F_needs: await T(9, 3), G_reorder: await T(10, 3), H_card: await T(11, 3), I_tooltip: await T(12, 1), J_slider: await T(13, 1),
  K_toggle: await T(14, 1), L_pullback: await T(15, 3), M_last_frame: 479 / 60, N_frame_1: 1 / 60
};
for (const [name, t] of Object.entries(times)) {
  await p.evaluate(t => window.renderAt(t), t);
  await p.screenshot({ path: path.join(out, `still-${name}.png`) });
}
await p.evaluate(() => window.seek(7.25)); const a = await p.screenshot();
await p.evaluate(() => { window.seek(3.1); window.seek(7.25); }); const c = await p.screenshot();
console.log('seek(7.25) twice identical:', Buffer.compare(a, c) === 0, logs.filter(l => !/Failed to load/.test(l)));
await b.close();
