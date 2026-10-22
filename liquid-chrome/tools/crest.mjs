// every tonal hit, rendered alone through the full Web Audio graph: where is its biggest waveform peak?
import { openPage } from './lib.mjs';
const { browser, page } = await openPage({ file: 'sound.html', size: 400 });
await page.waitForFunction(() => window.soundReady, null, { timeout: 600000 });
const rows = await page.evaluate(async () => {
  const api = window.soundApi, out = [];
  for (const e of api.events().filter(e => e.bus === 'hits' && !['inhale', 'swell', 'shimmer'].includes(e.id))) {
    const [L, R] = await api.renderMix({ include: new Set([e.id]), loops: [1] });
    let pk = 0, at = 0;
    for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (v > pk) { pk = v; at = i; } }
    out.push({ id: e.id, expect: e.n0 + 288000, got: at, d: at - (e.n0 + 288000) });
  }
  return out;
});
console.log(rows.map(r => `${r.id.padEnd(9)} expected ${r.expect}  peak ${r.got}  ${r.d === 0 ? 'exact' : 'OFF by ' + r.d}`).join('\n'));
console.log('all exact:', rows.every(r => r.d === 0));
await browser.close();
