'use server';

import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { companies, notifications } from '@/db/schema';
import { TRIPOT_CONFIG } from '../../../coaris.config';
import { buildKpiForCompany } from '@/lib/bridge/translator';

export type SendReportResult = {
  success: boolean;
  message: string;
  payload?: unknown;
  hqStatus?: number;
};

export async function sendMonthlyReportToHq(yearMonth: string): Promise<SendReportResult> {
  const session = await auth();
  if (!session?.user?.member_id) {
    return { success: false, message: '認証が必要です' };
  }

  const companyId = session.user.company_id;

  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return { success: false, message: 'yearMonth が YYYY-MM 形式ではありません' };
  }

  const company = await db.query.companies.findFirst({
    where: (c, { eq }) => eq(c.id, companyId),
  });

  if (!company) {
    return { success: false, message: '会社情報が見つかりません' };
  }

  const kpi = await buildKpiForCompany({
    companySlug: TRIPOT_CONFIG.id,
    companyId,
    period: yearMonth,
  });

  if (!kpi) {
    return { success: false, message: 'KPI 集計に失敗しました' };
  }

  const hqUrl = process.env.HQ_BRIDGE_URL;
  let hqStatus = 0;
  let hqMessage = '本部URL未設定（HQ_BRIDGE_URL）— ローカル記録のみ';

  if (hqUrl) {
    try {
      const response = await fetch(hqUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HQ_BRIDGE_TOKEN ?? ''}`,
        },
        body: JSON.stringify(kpi),
        signal: AbortSignal.timeout(10000),
      });
      hqStatus = response.status;
      hqMessage = response.ok
        ? `✓ 本部送信成功（HTTP ${response.status}）`
        : `送信失敗（HTTP ${response.status}）`;
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      hqMessage = `送信エラー: ${err}`;
    }
  }

  const ruleKey = `monthly_report.${yearMonth}`;

  await db.insert(notifications).values({
    company_id: companyId,
    member_id: null,
    rule_key: ruleKey,
    channel: 'app',
    title: `📤 ${yearMonth} 月次レポート ${hqStatus === 200 ? '送信完了' : hqUrl ? '送信試行' : 'ローカル保存'}`,
    body: hqMessage,
    status: 'queued',
    payload: { yearMonth, hqStatus, kpiSnapshot: kpi },
  });

  await logAudit({
    member_id: session.user.member_id,
    company_id: companyId,
    action: 'monthly_report.send_to_hq',
    resource_type: 'kpi_export',
    metadata: { yearMonth, hqStatus, hqUrl: hqUrl ? 'set' : 'unset' },
  });

  revalidatePath('/monthly');
  revalidatePath('/notifications');

  return {
    success: hqStatus === 200 || !hqUrl,
    message: hqMessage,
    payload: kpi,
    hqStatus,
  };
}
