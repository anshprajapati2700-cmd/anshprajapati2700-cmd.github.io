// Capture the real product (tools/workshop-product.html, the Agent Workshop) as image assets plus the layout boxes of every element the
// walkthrough points at. The product runs against a small stub of the Claude artifact runtime (the same four agents as the live page).
//   node tools/capture.mjs            ->  assets/*.png and assets/layout.json
import { chromium } from '../../liquid-chrome/tools/lib.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets');
const html = '<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + fs.readFileSync(path.join(root, 'tools/workshop-product.html'), 'utf8') + '</body></html>';
const DPR = 3;
const stub = () => {
  const now = Date.now();
  const sessions = { ccr: { data: [
    { id: 'session_a1', title: 'Liquid Chrome animation', session_status: 'SESSION_STATUS_RUNNING', status_bucket: 'SESSION_STATUS_BUCKET_WORKING', updated_at: new Date(now - 60e3).toISOString(), created_at: new Date(now - 4 * 3600e3).toISOString(), connection_status: 'connected', origin: 'desktop_app', session_context: { model: 'claude-sonnet-5-5', outcomes: [{ git_repository: { git_info: { repo: 'me/site', branches: ['claude/x'] } } }] }, external_metadata: { context_usage: { used_tokens: 500000, max_tokens: 1000000 } } },
    { id: 'session_b2', title: 'Clipper agent memory', session_status: 'SESSION_STATUS_IDLE', status_bucket: 'SESSION_STATUS_BUCKET_BLOCKED', updated_at: new Date(now - 3 * 86400e3).toISOString(), connection_status: 'disconnected', post_turn_summary: { status_category: 'need_input', needs_action: 'Send a screen recording or describe the edits' }, external_metadata: { context_usage: { used_tokens: 90000, max_tokens: 1000000 } } },
    { id: 'session_c3', title: 'Old research run', session_status: 'SESSION_STATUS_ARCHIVED', status_bucket: 'SESSION_STATUS_BUCKET_COMPLETED', updated_at: new Date(now - 20 * 86400e3).toISOString() },
    { id: 'session_d4', title: 'Another finished one', session_status: 'SESSION_STATUS_ARCHIVED', status_bucket: 'SESSION_STATUS_BUCKET_COMPLETED', updated_at: new Date(now - 30 * 86400e3).toISOString() } ] } };
  const docs = [
    { id: 'whatsapp-bot', name: 'WhatsApp bot', kind: 'whatsapp', state: 'working', note: 'Answering patient messages', reportedAt: now - 20 * 60e3, ttlMin: 360, order: 1, by: 'page' },
    { id: 'outreach-agent', name: 'Outreach agent', kind: 'outreach', state: 'rest', note: '', reportedAt: null, ttlMin: 1440, order: 2 } ];
  window.__docs = docs;
  window.claude = { use: async (n) => {
    if (n === 'mcp') return { watchTool: (s, t, i, h) => { setTimeout(() => h({ type: 'data', result: { payload: t === 'list_sessions' ? sessions : { data: [] } } }), 50); return () => {}; }, invalidate: async () => {}, callTool: async () => ({ payload: sessions }) };
    if (n === 'db') return { collection: () => ({ onSnapshot: (cb) => { window.__push = () => cb({ docs: docs.map(d => ({ id: d.id, data: () => { const { id, ...r } = d; return r; } })) }); setTimeout(window.__push, 80); return () => {}; }, add: async () => {} }),
      doc: (p) => ({ update: async (d) => { const t = docs.find(x => p.endsWith(x.id)); if (t) Object.assign(t, d); window.__push && window.__push(); } }) };
    return null; } };
};
const b = await chromium.launch({ args: ['--disable-partial-raster'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', deviceScaleFactor: DPR });
const p = await ctx.newPage();
await p.route('**/*', r => r.request().url().startsWith('about:') || r.request().url().startsWith('data:') ? r.continue() : r.abort());
await p.goto('about:blank'); await p.evaluate(stub); await p.setContent(html); await p.waitForTimeout(4200);
// pause the product's own animations so every capture is a settled frame
await p.addStyleTag({ content: '*, *::before, *::after { animation-play-state: paused !important; caret-color: transparent !important; }' });
const rect = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + scrollX, r.y + scrollY, r.width, r.height]; }, sel);
const layout = { page: null, tally: [], bays: {}, sheets: {} };
await p.screenshot({ path: path.join(out, 'base0.png'), fullPage: true });
layout.page = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
layout.bodyBg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
layout.headline = await rect('#headline'); layout.refresh = await rect('#refresh'); layout.title = await rect('h1');
const nTally = await p.evaluate(() => document.querySelectorAll('#tally li').length);
for (let i = 1; i <= nTally; i++) layout.tally.push(await rect(`#tally li:nth-child(${i})`));
for (const id of ['session_b2', 'session_a1', 'whatsapp-bot', 'outreach-agent']) {
  layout.bays[id] = { box: await rect(`.bay[data-id="${id}"]`), card: await rect(`.bay[data-id="${id}"] .card, .bay[data-id="${id}"] .nm, .bay[data-id="${id}"] .info`), canvas: await rect(`.bay[data-id="${id}"] canvas`) };
}
layout.floor1 = await rect('#fl1'); layout.floor2 = await rect('#fl2'); layout.clock = await rect('#clock, .clock, svg'); layout.board = await rect('.board');
// sheet for the agent that needs you
async function sheet(id, name, opts) {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.click(`.bay[data-id="${id}"]`); await p.waitForTimeout(1600);
  const el = await p.$('#sheet');
  await el.screenshot({ path: path.join(out, `${name}.png`) });
  const sr = await p.evaluate(() => { const r = document.getElementById('sheet').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
  const kids = {};
  for (const [k, sel] of Object.entries(opts || {})) { const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, sel); kids[k] = r && [r[0] - sr[0], r[1] - sr[1], r[2], r[3]]; }
  layout.sheets[name] = { size: [sr[2], sr[3]], kids };
}
await sheet('session_b2', 'sheet_clipper', { back: '#sheet .btn', msg: '#sheet [class*=say], #sheet .msg, #sheet p', hp: '#sheet .hp, #sheet .bar', open: '#sheet .btn.go, #sheet a, #sheet .btn:last-of-type' });
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
await sheet('outreach-agent', 'sheet_outreach', { back: '#sheet .btn', msg: '#sheet p', status: '#sheet .opts, #sheet fieldset', needs: '.opt[data-set="needs"]', working: '.opt[data-set="working"]', rest: '.opt[data-set="rest"]', note: '#sheet input[type=text]', save: '#sheet .btn.save, #sheet button[type=submit]' });
// hover the option so the capture shows the product's own hover/selected styling
await p.hover('.opt[data-set="needs"]'); await p.waitForTimeout(300);
await (await p.$('#sheet')).screenshot({ path: path.join(out, 'sheet_outreach_hover.png') });
await p.click('.opt[data-set="needs"]'); await p.waitForTimeout(1200);
const stillOpen = await p.evaluate(() => !document.getElementById('veil').hidden);
layout.optClickClosesSheet = !stillOpen;
if (stillOpen) { await (await p.$('#sheet')).screenshot({ path: path.join(out, 'sheet_outreach_after.png') }); await p.keyboard.press('Escape'); await p.waitForTimeout(700); }
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(4200);
await p.screenshot({ path: path.join(out, 'base1.png'), fullPage: true });
layout.tally1 = []; for (let i = 1; i <= nTally; i++) layout.tally1.push(await rect(`#tally li:nth-child(${i})`));
layout.headline1 = await rect('#headline');
layout.dpr = DPR; layout.viewport = [1280, 900];
fs.writeFileSync(path.join(out, 'layout.json'), JSON.stringify(layout, null, 1));
console.log(JSON.stringify({ page: layout.page, bg: layout.bodyBg, tally: layout.tally.length, closes: layout.optClickClosesSheet, sheets: layout.sheets }, null, 1));
await b.close();
