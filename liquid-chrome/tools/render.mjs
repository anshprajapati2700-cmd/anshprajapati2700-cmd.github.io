// Renders the 360 frames of the loop (t = f / 60) at 1080 x 1080 through window.renderAt and writes PNGs.
// usage: node render.mjs <out_dir> [first=0] [last=359]      (resumable: existing frames are skipped)
import { openPage } from './lib.mjs';
import fs from 'fs';
const [outDir, a = '0', b = '359'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const { browser, page, logs } = await openPage({ query: '?t=0', size: 1080 });
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 900000 });
const err = await page.evaluate(() => window.__error);
if (err) { console.error(err); process.exit(1); }
const t0 = Date.now();
let done = 0;
for (let f = +a; f <= +b; f++) {
  const file = `${outDir}/${String(f).padStart(5, '0')}.png`;
  if (fs.existsSync(file) && fs.statSync(file).size > 10000) continue;
  await page.evaluate(t => window.renderAt(t), f / 60);
  const url = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  fs.writeFileSync(file + '.tmp', Buffer.from(url.split(',')[1], 'base64'));
  fs.renameSync(file + '.tmp', file);
  done++;
  if (done % 10 === 0) console.log(`frame ${f}  ${((Date.now() - t0) / 1000 / done).toFixed(2)} s/frame`);
}
console.log('done', done, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's');
await browser.close();
