// Capture the demo frames at full 1920x1080 from the live deployment.
//
//   node scripts/capture-demo-frames.mjs
//
// Uses puppeteer-core against the Chromium that Playwright already downloaded,
// so nothing large is installed. Frames land in assets/demo/frames/.
//
// Why not the browser-extension screenshots: those return a scaled viewport
// capture and dropped frames under batching. A dedicated headless pass gives a
// deterministic sequence at the real output resolution, which is what a video
// needs.

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'assets', 'demo', 'frames');
const CHROME =
  process.env.CHROME_PATH ??
  join(
    process.env.LOCALAPPDATA ?? '',
    'ms-playwright',
    'chromium-1228',
    'chrome-win64',
    'chrome.exe'
  );

const require = createRequire(join(process.env.TEMP ?? '', 'frcap', 'package.json'));
const puppeteer = require('puppeteer-core');

const BASE = 'https://fieldrelay-pi.vercel.app';

// slug, path, scrollY, settle-ms
const SHOTS = [
  ['01-signin', '/auth/sign-in', 0, 1500],
  ['02-mission-guardrails', '/mission-control', 0, 2500],
  ['03-mission-metrics', '/mission-control', 620, 2500],
  ['04-mission-orchestration', '/mission-control', 1250, 2500],
  ['05-incidents', '/incidents', 0, 2000],
  ['06-calls', '/calls', 0, 2000],
  ['07-approvals-approved', '/approvals?status=approved', 0, 2500],
  ['08-dispatch', '/dispatch', 0, 2500],
  ['09-vendors', '/vendors', 0, 2500],
  ['10-vendors-revoked', '/vendors', 420, 2500],
  ['11-analytics', '/analytics', 0, 2500],
  ['12-analytics-pending', '/analytics', 900, 2500],
  ['13-settings', '/settings', 0, 2000]
];

if (!existsSync(CHROME)) {
  console.error(`  Chromium not found at ${CHROME}\n  Set CHROME_PATH and retry.`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  args: ['--force-device-scale-factor=1', '--hide-scrollbars']
});

try {
  const page = await browser.newPage();

  // Sign in once. The evaluator credentials are published on purpose, so this
  // is the same path a judge takes.
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));

  // Frame 1 is the signed-out screen, captured before we sign in.
  await page.screenshot({ path: join(OUT, '01-signin.png') });
  console.log('  01-signin');

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      /continue as demo/i.test(b.textContent ?? '')
    );
    button?.click();
  });
  await new Promise((r) => setTimeout(r, 4000));

  for (const [slug, path, scrollY, settle] of SHOTS.slice(1)) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, settle));
    if (scrollY > 0) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
      await new Promise((r) => setTimeout(r, 700));
    }
    await page.screenshot({ path: join(OUT, `${slug}.png`) });
    console.log(`  ${slug}`);
  }
} finally {
  await browser.close();
}

console.log(`\n  Frames written to assets/demo/frames/`);
