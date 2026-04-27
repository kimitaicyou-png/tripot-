'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { seedDefaultRolePermissions } from '@/lib/actions/role-permissions';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

export function RolesAdminControls({ existingCount }: { existingCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSeed() {
    if (existingCount > 0) {
      if (!confirm(`既に ${existingCount} 件登録済です。それでも seed しますか？（既存上書きはしません）`)) return;
    }
    startTransition(async () => {
      try {
        const r = await seedDefaultRolePermissions();
        if (r.inserted === 0) {
          toast.info('既存データがあるため投入をスキップしました', {
            description: `スキップ ${r.skipped} 件`,
          });
        } else {
          toast.success(`${r.inserted} 件 投入しました`);
        }
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '投入失敗';
        toast.error('投入失敗', { description: msg });
      }
    });
  }

  return (
    <Button type="button" variant="primary" size="sm" onClick={handleSeed} disabled={pending}>
      {pending ? '投入中…' : '🌱 初期マトリクス投入'}
    </Button>
  );
}
