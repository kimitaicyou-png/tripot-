/**
 * E2E walk via Playwright + dev-bypass auth
 *
 * 隊長明示承認下（2026-04-29 21:24）の dev only 自動 walk。
 * 認証経路は Credentials provider (id=dev-bypass) で email-only ログイン、
 * NODE_ENV='development' AND DEV_AUTO_LOGIN='1' の二段ガード。
 *
 * 結果: /tmp/e2e-walk-results/<timestamp>/
 * - login.png（認証前）
 * - <page-name>.png（各画面）
 * - errors.json（console error / network failure 集計）
 * - report.md（人間可読サマリ）
 */
import { chromium, type ConsoleMessage, type Request as PWRequest } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 'http://localhost:3100';
const EMAIL = 'k.toki@coaris.ai';
const TOKI_MEMBER_ID = '20df36b2-be5d-4392-ba4e-28218d73d529';

const RESULTS_DIR = `/tmp/e2e-walk-results/${new Date()
  .toISOString()
  .replace(/[:.]/g, '-')}`;

type WalkPage = { path: string; name: string; description: string };

const PAGES: WalkPage[] = [
  { path: '/login', name: 'login', description: 'ログイン画面（認証前）' },
  { path: `/home/${TOKI_MEMBER_ID}`, name: 'home', description: 'Step 1: 個人ダッシュ' },
  { path: '/deals', name: 'deals-list', description: 'Step 3: 案件一覧' },
  { path: '/weekly', name: 'weekly', description: 'Step 4: 行動量集計' },
  { path: '/weekly/cf', name: 'weekly-cf', description: 'Step 5: 6週CF予測（v1 になかった）' },
  { path: '/weekly/input', name: 'weekly-input', description: '行動量まとめ入力（B3.2）' },
  { path: '/weekly/pl', name: 'weekly-pl', description: 'PL（B3.4）' },
  { path: '/monthly', name: 'monthly', description: 'Step 6: 月次 売上 vs 計画' },
  { path: '/budget', name: 'budget', description: '事業計画' },
  { path: '/team', name: 'team', description: 'チーム一覧' },
  { path: '/customers', name: 'customers', description: '顧客一覧' },
  { path: '/tasks', name: 'tasks', description: 'タスク' },
  { path: '/production', name: 'production', description: '製造管理（B4.2 D&D kanban）' },
  { path: '/notifications', name: 'notifications', description: 'B5.6 bridge_notices 3件' },
  { path: '/approval', name: 'approval', description: '承認' },
  { path: '/settings', name: 'settings', description: '設定ハブ（朝整理）' },
];

type PageResult = {
  name: string;
  path: string;
  status: 'ok' | 'error';
  httpStatus?: number;
  screenshot: string;
  consoleErrors: string[];
  networkFailures: string[];
  loadMs: number;
};

async function main() {
  await mkdir(RESULTS_DIR, { recursive: true });
  console.log(`[walk] results dir: ${RESULTS_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // === 1. CSRF token 取得 ===
  const csrfRes = await context.request.get(`${BASE}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  console.log(`[walk] csrfToken obtained (${csrfToken.slice(0, 8)}...)`);

  // === 2. dev-bypass 経由でログイン ===
  const signInRes = await context.request.post(
    `${BASE}/api/auth/callback/dev-bypass`,
    {
      form: {
        email: EMAIL,
        csrfToken,
        callbackUrl: `${BASE}/`,
        json: 'true',
      },
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    },
  );
  console.log(`[walk] signin status: ${signInRes.status()}`);

  // === 3. session 確認 ===
  const sessionRes = await context.request.get(`${BASE}/api/auth/session`);
  const session = await sessionRes.json();
  if (!session?.user) {
    console.error('[walk] FATAL: session not established', session);
    await browser.close();
    process.exit(1);
  }
  console.log(`[walk] session established: ${session.user.email} / role=${session.user.role}`);

  // === 4. 各 page walk ===
  const results: PageResult[] = [];

  for (const wp of PAGES) {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    const onConsole = (msg: ConsoleMessage) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    };
    const onRequestFailed = (req: PWRequest) => {
      networkFailures.push(`${req.method()} ${req.url()} → ${req.failure()?.errorText ?? '?'}`);
    };

    page.on('console', onConsole);
    page.on('requestfailed', onRequestFailed);

    const start = Date.now();
    let httpStatus: number | undefined;
    let status: 'ok' | 'error' = 'ok';

    try {
      const resp = await page.goto(`${BASE}${wp.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      httpStatus = resp?.status();
      if (!resp?.ok()) status = 'error';
      // ページ完全描画待ち（小さな delay）
      await page.waitForTimeout(800);
    } catch (e: any) {
      console.error(`[walk] ${wp.name} failed: ${e.message}`);
      status = 'error';
    }

    const screenshotPath = join(RESULTS_DIR, `${wp.name}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (e: any) {
      console.error(`[walk] ${wp.name} screenshot failed: ${e.message}`);
    }

    const loadMs = Date.now() - start;
    page.off('console', onConsole);
    page.off('requestfailed', onRequestFailed);

    const result: PageResult = {
      name: wp.name,
      path: wp.path,
      status,
      httpStatus,
      screenshot: screenshotPath,
      consoleErrors,
      networkFailures,
      loadMs,
    };
    results.push(result);

    const errFlag = consoleErrors.length > 0 ? ` ⚠️${consoleErrors.length} console err` : '';
    const netFlag = networkFailures.length > 0 ? ` ⚠️${networkFailures.length} net fail` : '';
    console.log(
      `[walk] ${status === 'ok' ? '✅' : '❌'} ${wp.name} (${httpStatus ?? '?'}, ${loadMs}ms)${errFlag}${netFlag}`,
    );
  }

  // === 5. 結果保存 ===
  await writeFile(
    join(RESULTS_DIR, 'errors.json'),
    JSON.stringify(results, null, 2),
  );

  // markdown レポート生成
  const okCount = results.filter((r) => r.status === 'ok').length;
  const errCount = results.length - okCount;
  const totalConsoleErr = results.reduce((s, r) => s + r.consoleErrors.length, 0);
  const totalNetErr = results.reduce((s, r) => s + r.networkFailures.length, 0);

  const md = [
    `# E2E walk report (Playwright + dev-bypass)`,
    ``,
    `生成時刻: ${new Date().toISOString()}`,
    `結果ディレクトリ: ${RESULTS_DIR}`,
    ``,
    `## サマリ`,
    `- 訪問ページ: ${results.length}`,
    `- 成功: ${okCount}`,
    `- エラー: ${errCount}`,
    `- console error 合計: ${totalConsoleErr}`,
    `- network failure 合計: ${totalNetErr}`,
    ``,
    `## ページ別`,
    ``,
    '| name | path | http | load | console err | net fail | screenshot |',
    '|---|---|---|---|---|---|---|',
    ...results.map(
      (r) =>
        `| ${r.name} | \`${r.path}\` | ${r.httpStatus ?? '?'} | ${r.loadMs}ms | ${r.consoleErrors.length} | ${r.networkFailures.length} | \`${r.screenshot.replace(RESULTS_DIR + '/', '')}\` |`,
    ),
    ``,
    `## 詰まり詳細`,
    ``,
    ...results
      .filter(
        (r) =>
          r.status === 'error' ||
          r.consoleErrors.length > 0 ||
          r.networkFailures.length > 0,
      )
      .flatMap((r) => [
        `### ${r.name} (${r.path})`,
        ``,
        `- status: ${r.status}, http: ${r.httpStatus ?? '?'}`,
        ...(r.consoleErrors.length > 0
          ? ['', '**console errors**:', ...r.consoleErrors.map((e) => `- ${e.slice(0, 200)}`)]
          : []),
        ...(r.networkFailures.length > 0
          ? ['', '**network failures**:', ...r.networkFailures.map((e) => `- ${e}`)]
          : []),
        ``,
      ]),
  ].join('\n');

  await writeFile(join(RESULTS_DIR, 'report.md'), md);

  console.log(`\n[walk] ✅ DONE`);
  console.log(`[walk] report: ${join(RESULTS_DIR, 'report.md')}`);
  console.log(
    `[walk] summary: ${okCount}/${results.length} ok, ${totalConsoleErr} console err, ${totalNetErr} net fail`,
  );

  await browser.close();
  process.exit(errCount > 0 || totalConsoleErr > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[walk] FATAL:', e);
  process.exit(1);
});
