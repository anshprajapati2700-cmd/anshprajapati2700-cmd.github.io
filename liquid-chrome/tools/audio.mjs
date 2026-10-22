// usage: node audio.mjs report | calibrate | export <out_dir>
import { openPage } from './lib.mjs';
import fs from 'fs';
const [cmd = 'report', arg] = process.argv.slice(2);
const { browser, page, logs } = await openPage({ file: 'sound.html', size: 400 });
await page.waitForFunction(() => window.soundReady, null, { timeout: 600000 });
await page.evaluate(() => window.soundReady);
const fmt = r => r.map(x => `${x.group.padEnd(6)} over ${x.over.toFixed(2).padStart(6)} dB  n0 ${String(x.n0).padStart(6)} peak@ ${String(x.peakAt).padStart(6)} ${x.peakAt === x.n0 ? 'ok' : 'OFF ' + (x.peakAt - x.n0)}  ${x.members.join(',')}  limiter ${x.limiterCostDb == null ? '' : x.limiterCostDb.toFixed(2)} -> over ${x.overAfterLimiter == null ? '' : x.overAfterLimiter.toFixed(2)}`).join('\n');
if (cmd === 'calibrate') {
  const r = await page.evaluate(async () => { const r = await window.soundApi.calibrate(2); return { r, trims: window.soundApi.trims() }; });
  console.log(fmt(r.r)); console.log(JSON.stringify(r.trims));
  if (arg) fs.writeFileSync(arg, JSON.stringify(r.trims));
} else if (cmd === 'report') {
  const r = await page.evaluate(async () => await window.soundApi.report());
  console.log(JSON.stringify({ ...r, hits: undefined }, null, 1)); console.log(fmt(r.hits));
} else if (cmd === 'export') {
  fs.mkdirSync(arg, { recursive: true });
  const m = await page.evaluate(async () => await window.soundApi.masterInfo());
  console.log(m);
  for (const [name, fn] of [['master', 'masterWav'], ['article', 'articleWav']]) {
    const bytes = await page.evaluate(async fn => await window.soundApi[fn](), fn);
    fs.writeFileSync(`${arg}/${name}.wav`, Buffer.from(bytes));
  }
}
console.log(logs.filter(l => !/GPU stall/.test(l)).slice(0, 10).join('\n'));
await browser.close();
