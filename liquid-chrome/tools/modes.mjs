import { openPage } from './lib.mjs';
import crypto from 'crypto';
const hash = async page => crypto.createHash('md5').update(await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))).digest('hex').slice(0, 8);
for (const q of ['?res=240', '?res=240&t=1.5']) {
  const { browser, page, logs } = await openPage({ query: q, size: 240 });
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000 });
  await page.waitForTimeout(1500);
  const a = await hash(page); await page.waitForTimeout(1500); const b = await hash(page);
  console.log(q, 'ready', await page.evaluate(() => window.__ready), 'frames differ over time:', a !== b, a, b, logs.filter(l => /error|warn/i.test(l) && !/GPU stall/.test(l)).slice(0, 3));
  await browser.close();
}
