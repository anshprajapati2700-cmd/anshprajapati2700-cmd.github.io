// Shared helpers: serve the page from disk and the pinned three.js r160 files from a local npm install,
// so the page can be exercised without reaching cdn.jsdelivr.net. The page itself only ever references jsdelivr.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
let pw;
for (const base of [process.env.PW_DIR, import.meta.url, '/opt/node-tools/node_modules/']) {
  if (!base) continue;
  try { pw = createRequire(base)('playwright'); break; } catch { /* try the next location */ }
}
if (!pw) throw new Error('playwright not found: npm i playwright in tools/, or set PW_DIR');
export const { chromium } = pw;
export const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '..');
const THREE_DIR = process.env.THREE_DIR || path.join(here, 'node_modules', 'three');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
const ORIGIN = 'https://lc.test';

export async function openPage({ query = '', size = 1080, headless = true, file = 'index.html' } = {}) {
  const browser = await chromium.launch({ headless, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const ctx = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(CDN)) {
      const f = path.join(THREE_DIR, url.slice(CDN.length));
      if (fs.existsSync(f)) return route.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith('.json') ? 'application/json' : 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
      return route.fulfill({ status: 404, body: 'missing ' + f });
    }
    if (url.startsWith(ORIGIN)) {
      const u = new URL(url);
      const f = path.join(root, decodeURIComponent(u.pathname.replace(/^\/liquid-chrome\//, '')));
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
      return route.fulfill({ status: 404, body: 'not found' });
    }
    return route.abort();
  });
  await page.goto(`${ORIGIN}/liquid-chrome/${file}${query}`);
  return { browser, page, logs };
}
