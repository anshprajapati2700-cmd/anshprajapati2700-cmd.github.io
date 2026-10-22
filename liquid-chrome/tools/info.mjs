import { openPage } from './lib.mjs';
const { browser, page, logs } = await openPage({ query: `?res=128&t=0`, size: 128 });
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000 });
console.log(JSON.stringify(await page.evaluate(() => window.__info()), null, 1));
console.log('segments', await page.evaluate(() => window.__segments));
await browser.close();
