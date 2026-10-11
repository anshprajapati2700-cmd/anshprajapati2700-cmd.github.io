// usage: node shot.mjs out_dir res t1 t2 ...   -> out_dir/t_<t>.png
import { openPage } from './lib.mjs';
import fs from 'fs';
const [outDir, res, ...ts] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const { browser, page, logs } = await openPage({ query: `?res=${res}&t=0`, size: +res });
const t0 = Date.now();
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000 });
console.log('ready', (Date.now() - t0) / 1000, 's', 'error:', await page.evaluate(() => window.__error));
for (const t of ts) {
  const a = Date.now();
  await page.evaluate(t => window.renderAt(t), +t);
  const url = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  fs.writeFileSync(`${outDir}/t_${(+t).toFixed(3)}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('t', t, (Date.now() - a) / 1000, 's');
}
console.log(logs.slice(0, 40).join('\n'));
await browser.close();
