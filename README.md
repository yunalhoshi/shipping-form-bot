# Shipping Form Bot

Playwright bot that fills a carrier's shipping form once per row of a CSV and records the confirmation number. Built to remove repetitive data entry: the same recipient and package details typed into a web portal again and again.

> **About this repository:** the original bot was built for a client to fill UPS shipping forms. The client code and data are not published. This is a short rewrite of the core idea that runs against a **local demo form** (`demo/form.html`), so it never touches a real carrier site.

## How it works

1. Reads `shipments.csv` (one shipment per row).
2. Validates required fields and skips bad rows with a reason.
3. Opens the form, fills text fields and dropdowns through a single field map.
4. Dry run by default; with `--submit` it clicks submit and waits for the confirmation number.
5. On an error it saves a screenshot of that row and continues with the next one.
6. Prints a results table and writes `results.json`.

Pointing it at another portal means changing only the `FIELDS` map (CSV column → selector → text or select).

## Run

```bash
npm install
npx playwright install chromium
npm run dry      # fill every row, stop before submit
npm run demo     # fill and submit against the local demo form
node bot.mjs --csv my.csv --headed   # watch it work
```

```text
┌─────┬────────┬───────────────┐
│ row │ status │ detail        │
├─────┼────────┼───────────────┤
│ 2   │ OK     │ DEMO-SKK0SD   │
│ 3   │ OK     │ DEMO-YX4CBC   │
└─────┴────────┴───────────────┘
```

## Notes for real portals

Check the portal's terms of use before automating it, keep a human review step before submitting, and never store portal passwords in the repo.

## Tech stack

Node.js · Playwright

---

© 2026 yunalhoshi. All rights reserved. See [NOTICE](NOTICE).
