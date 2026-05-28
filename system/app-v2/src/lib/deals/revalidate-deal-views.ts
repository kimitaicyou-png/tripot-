import { revalidatePath } from 'next/cache';

/**
 * 案件の数値（金額 / 主観確度 / ステージ / 担当 / 受注予定日 / 外注原価）変更時に、
 * その案件が集計される全ビューを一括で再検証する。
 *
 * 2026-05-28 隊長報告 4-① / 4-⑥ / 4-⑦ の根本対応：
 * 旧実装は update 系 server action ごとに revalidatePath がバラバラで、
 * `/deals` と `/deals/[id]` しか再検証しないものが多かった。
 * 確度・金額・ステージは予測売上（CF 加重・主観確度ハイブリッド）に直結し、
 * /monthly・/weekly・/budget・/home で集計されるため、deals だけ revalidate すると
 * 予実画面が古い数字を表示し「画面によって数字が違う」状態になっていた。
 *
 * 数値が予実に影響する全 update action から本関数を呼ぶことで、
 * どの画面を開いても同じ最新値が出るようにする（数字の信頼性 = 運用の前提）。
 */
export function revalidateDealViews(dealId: string): void {
  // 案件そのもの
  revalidatePath(`/deals/${dealId}`);
  revalidatePath('/deals');
  // 個人ダッシュボード（動的ルート、全メンバー分を page 単位で再検証）
  revalidatePath('/home/[memberId]', 'page');
  // 予実ビュー（売上・粗利・CF 予測がここで集計される）
  revalidatePath('/monthly');
  revalidatePath('/weekly');
  revalidatePath('/budget');
}
