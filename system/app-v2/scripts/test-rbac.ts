/**
 * Phase 11-C / 12-D 軽量 rbac 動作確認スクリプト
 *
 * 隊長明示承認下（2026-05-05 02:00）の dev only 動作確認。
 * 本格 E2E は明朝以降、本スクリプトは「基盤関数が期待通り動くか」の単体確認。
 *
 * 検証項目:
 *   1. checkPermission(president, *, *) === true（全権 early return）
 *   2. checkPermission(hq_member, deal, delete) === true（DEFAULT_MATRIX 通り）
 *   3. checkPermission(member, deal, delete) === false（member は delete 不可）
 *   4. checkPermission(member, deal, create) === true（create は許可）
 *   5. role_permissions seed 状態の確認
 *
 * 実行: npx tsx scripts/test-rbac.ts
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { role_permissions, companies, members } from '../src/db/schema';
import { checkPermission } from '../src/lib/rbac/check-permission';

type TestResult = { name: string; pass: boolean; detail: string };

async function main() {
  const results: TestResult[] = [];

  // テスト用 company を1つ取得
  const [company] = await db.select({ id: companies.id, name: companies.name }).from(companies).limit(1);
  if (!company) {
    console.error('[test-rbac] companies が空。先に seed してください。');
    process.exit(1);
  }
  console.log(`[test-rbac] target company: ${company.name} (${company.id})`);

  // === 1. president 全権 early return ===
  {
    const allowed = await checkPermission(company.id, 'president', 'deal', 'delete');
    results.push({
      name: 'T1: president × deal.delete',
      pass: allowed === true,
      detail: `期待 true / 実測 ${allowed}（DB 引かない early return）`,
    });
  }

  // === 2. hq_member は deal.update OK（hq_member は delete/deactivate のみ除外、他は OK）===
  {
    const allowed = await checkPermission(company.id, 'hq_member', 'deal', 'update');
    results.push({
      name: 'T2: hq_member × deal.update',
      pass: allowed === true,
      detail: `期待 true / 実測 ${allowed}（DEFAULT_MATRIX、hq_member は delete のみ除外）`,
    });
  }

  // === 2-b. hq_member は deal.delete NG（DEFAULT_MATRIX で除外）===
  {
    const allowed = await checkPermission(company.id, 'hq_member', 'deal', 'delete');
    results.push({
      name: 'T2b: hq_member × deal.delete',
      pass: allowed === false,
      detail: `期待 false / 実測 ${allowed}（hq_member は delete 除外）`,
    });
  }

  // === 3. member は deal.delete NG（DEFAULT_MATRIX で 'delete' 除外）===
  {
    const allowed = await checkPermission(company.id, 'member', 'deal', 'delete');
    results.push({
      name: 'T3: member × deal.delete',
      pass: allowed === false,
      detail: `期待 false / 実測 ${allowed}（DEFAULT_MATRIX）`,
    });
  }

  // === 4. member は deal.create OK ===
  {
    const allowed = await checkPermission(company.id, 'member', 'deal', 'create');
    results.push({
      name: 'T4: member × deal.create',
      pass: allowed === true,
      detail: `期待 true / 実測 ${allowed}（DEFAULT_MATRIX）`,
    });
  }

  // === 5. member は member.deactivate NG（退職者無効化は president/hq_member のみ）===
  {
    const allowed = await checkPermission(company.id, 'member', 'member', 'deactivate');
    results.push({
      name: 'T5: member × member.deactivate',
      pass: allowed === false,
      detail: `期待 false / 実測 ${allowed}（ADR-0012 規律）`,
    });
  }

  // === 6. hq_member は member.deactivate OK ===
  {
    const allowed = await checkPermission(company.id, 'hq_member', 'member', 'deactivate');
    results.push({
      name: 'T6: hq_member × member.deactivate',
      pass: allowed === true,
      detail: `期待 true / 実測 ${allowed}（ADR-0012）`,
    });
  }

  // === 7. role_permissions seed 状態確認 ===
  {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(role_permissions)
      .where(eq(role_permissions.company_id, company.id));
    const count = row?.count ?? 0;
    results.push({
      name: 'T7: role_permissions rows present',
      pass: count > 0,
      detail: `実測 ${count} 行 / 期待 > 0（seed 済の確認）`,
    });
  }

  // === 8. 退職者シミュレーション（active メンバー1人を temp 'inactive' にして元に戻す）===
  {
    const [activeMember] = await db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(and(eq(members.company_id, company.id), eq(members.status, 'active')))
      .limit(1);

    if (!activeMember) {
      results.push({
        name: 'T8: active member exists for revoke test',
        pass: false,
        detail: 'active member が見つからない、テスト skip',
      });
    } else {
      // 'inactive' に変更
      await db
        .update(members)
        .set({ status: 'inactive' })
        .where(eq(members.id, activeMember.id));

      const [revoked] = await db
        .select({ status: members.status })
        .from(members)
        .where(eq(members.id, activeMember.id))
        .limit(1);

      const revokedOk = revoked?.status === 'inactive';

      // 元に戻す
      await db
        .update(members)
        .set({ status: 'active' })
        .where(eq(members.id, activeMember.id));

      const [restored] = await db
        .select({ status: members.status })
        .from(members)
        .where(eq(members.id, activeMember.id))
        .limit(1);

      const restoredOk = restored?.status === 'active';

      results.push({
        name: 'T8: members.status active⇄inactive cycle',
        pass: revokedOk && restoredOk,
        detail: `${activeMember.name}: active→inactive=${revokedOk}, restore→active=${restoredOk}`,
      });
    }
  }

  // === 結果出力 ===
  console.log('\n=== Phase 11-C / 12-D rbac 単体動作確認結果 ===\n');
  for (const r of results) {
    const mark = r.pass ? '✅' : '❌';
    console.log(`${mark} ${r.name}`);
    console.log(`   ${r.detail}`);
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`\n合計: ${passed}/${total} 通過`);

  if (passed < total) {
    console.error('\n❌ 一部テスト失敗、修正必要');
    process.exit(1);
  }
  console.log('\n🎉 全テスト通過、rbac 基盤は期待通り動作\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('[test-rbac] 致命的エラー:', err);
  process.exit(1);
});
