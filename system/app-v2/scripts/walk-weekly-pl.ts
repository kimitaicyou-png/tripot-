import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const csrfRes = await context.request.get('http://localhost:3100/api/auth/csrf');
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };
  await context.request.post('http://localhost:3100/api/auth/callback/dev-bypass', {
    form: { email: 'k.toki@coaris.ai', csrfToken, callbackUrl: 'http://localhost:3100/', json: 'true' },
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:3100/weekly/pl', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  console.log(`weekly-pl console error count: ${errors.length}`);
  for (const e of errors) console.log('  -', e.slice(0, 150));
  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
