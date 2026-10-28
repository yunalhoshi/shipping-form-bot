// Fills a shipping form once per CSV row and records the confirmation number.
// Usage: node bot.mjs --csv examples/shipments.csv [--url http://...] [--headed] [--submit]
// Without --submit it fills every field and stops before the final click (dry run).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(k);

const CSV = arg('--csv', path.join(here, 'examples/shipments.csv'));
const URL = arg('--url', pathToFileURL(path.join(here, 'demo/form.html')).href);
const SUBMIT = flag('--submit');

// Field map: CSV column -> selector + how to fill it. Change this to target another portal.
const FIELDS = {
  name: ['#name', 'text'], company: ['#company', 'text'], address: ['#address', 'text'],
  city: ['#city', 'text'], zip: ['#zip', 'text'], country: ['#country', 'select'],
  weight: ['#weight', 'text'], service: ['#service', 'select'],
};
const REQUIRED = ['name', 'address', 'city', 'zip', 'weight'];

export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((v) => v.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

export function validate(rec) {
  return REQUIRED.filter((k) => !rec[k]).map((k) => `missing ${k}`)
    .concat(rec.weight && !(Number(rec.weight) > 0) ? ['weight must be a positive number'] : []);
}

async function fillOne(page, rec) {
  await page.goto(URL);
  for (const [col, [sel, kind]] of Object.entries(FIELDS)) {
    if (!rec[col]) continue;
    if (kind === 'select') await page.selectOption(sel, rec[col]);
    else await page.fill(sel, rec[col]);
  }
  if (!SUBMIT) return 'DRY-RUN';
  await page.click('button[type=submit]');
  await page.waitForSelector('#ok', { state: 'visible', timeout: 10000 });
  return (await page.textContent('#ref')).trim();
}

async function main() {
  const records = parseCsv(fs.readFileSync(CSV, 'utf8'));
  const browser = await chromium.launch({ headless: !flag('--headed') });
  const page = await browser.newPage();
  const results = [];
  for (const [i, rec] of records.entries()) {
    const problems = validate(rec);
    if (problems.length) { results.push({ row: i + 2, status: 'SKIPPED', detail: problems.join('; ') }); continue; }
    try {
      const ref = await fillOne(page, rec);
      results.push({ row: i + 2, status: 'OK', detail: ref });
    } catch (e) {
      await page.screenshot({ path: path.join(here, `error-row-${i + 2}.png`) }).catch(() => {});
      results.push({ row: i + 2, status: 'FAILED', detail: e.message.split('\n')[0] });
    }
  }
  await browser.close();
  console.table(results);
  fs.writeFileSync(path.join(here, 'results.json'), JSON.stringify(results, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
