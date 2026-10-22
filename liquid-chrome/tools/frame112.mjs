// check that no droplet leaves the frame during the flight (frame 112 was the bad one)
import { openPage } from './lib.mjs';
const { browser, page } = await openPage({ query: `?res=128&t=0`, size: 128 });
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000 });
const res = await page.evaluate(() => {
  const out = [];
  for (let f = 84; f <= 140; f++) {
    const t = f / 60, S = window.__state(t);
    const c = S.cam.pos, fw = [-c.x, -c.y, -c.z]; const n = Math.hypot(...fw); const F = fw.map(v => v / n);
    const up = [0, 1, 0];
    const R = [F[1] * up[2] - F[2] * up[1], F[2] * up[0] - F[0] * up[2], F[0] * up[1] - F[1] * up[0]]; const rn = Math.hypot(...R); const Rn = R.map(v => v / rn);
    const U = [Rn[1] * F[2] - Rn[2] * F[1], Rn[2] * F[0] - Rn[0] * F[2], Rn[0] * F[1] - Rn[1] * F[0]];
    const tan = Math.tan(15 * Math.PI / 180);
    let worst = 1e9;
    S.drops.forEach((d, i) => {
      if (d.rad < -0.2) return;
      const v = [d.pos[0] - c.x, d.pos[1] - c.y, d.pos[2] - c.z];
      const z = v[0] * F[0] + v[1] * F[1] + v[2] * F[2], x = v[0] * Rn[0] + v[1] * Rn[1] + v[2] * Rn[2];
      const sx = x / (z * tan);                                   // -1..1 across the frame
      const r = Math.max(d.rad, 0) * S.vel[i].s / (z * tan);       // stretched radius in NDC
      const px = (1 - Math.abs(sx) - r) * 540;                    // margin in pixels at 1080
      worst = Math.min(worst, px);
    });
    out.push([f, +worst.toFixed(1), +S.cam.D.toFixed(2)]);
  }
  return out;
});
console.log(res.map(r => r.join(' ')).join('\n'));
await browser.close();
