'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProjectTemplate,
  updateProjectTemplate,
  deleteProjectTemplate,
  seedDefaultTemplates,
  type ProjectTemplateFormState,
} from '@/lib/actions/project-templates';
import { FormField, TextInput, TextArea, Button, FormActions } from '@/components/ui/form';
import { Dialog, DialogHeader, DialogBody } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';

type Template = {
  id: string;
  name: string;
  description: string | null;
  created_at: Date | string;
};

const initialState: ProjectTemplateFormState = {};

function TemplateForm({
  initial,
  onSuccess,
}: {
  initial?: { id?: string; name?: string; description?: string | null };
  onSuccess?: () => void;
}) {
  const action = initial?.id ? updateProjectTemplate.bind(null, initial.id) : createProjectTemplate;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(initial?.id ? '更新しました' : '登録しました');
      if (!initial?.id) formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.success, initial?.id, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <FormField label="テンプレ名" required error={state.errors?.name?.[0]}>
        <TextInput name="name" defaultValue={initial?.name ?? ''} placeholder="" />
      </FormField>
      <FormField label="説明" hint="どんな案件で使うか、含まれる工程の概要">
        <TextArea name="description" rows={3} defaultValue={initial?.description ?? ''} />
      </FormField>
      {state.errors?._form && (
        <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
      )}
      <FormActions>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? '保存中…' : initial?.id ? '更新' : '登録'}
        </Button>
      </FormActions>
    </form>
  );
}

export function TemplatesAdmin({
  existingCount,
  templates,
}: {
  existingCount: number;
  templates: Template[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  function handleSeed() {
    if (existingCount > 0) {
      if (!confirm(`既に ${existingCount} 件登録済です。それでも seed しますか？`)) return;
    }
    startTransition(async () => {
      try {
        const r = await seedDefaultTemplates();
        if (r.inserted === 0) {
          toast.info('既存データがあるため投入をスキップしました');
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

  function handleDelete(t: Template) {
    if (!confirm(`「${t.name}」を削除しますか？`)) return;
    startTransition(async () => {
      try {
        await deleteProjectTemplate(t.id);
        toast.success('削除しました');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '削除失敗';
        toast.error('削除失敗', { description: msg });
      }
    });
  }

  return (
    <>
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900">テンプレート管理</p>
            <p className="text-xs text-gray-700 mt-1">
              登録済 <span className="font-mono">{existingCount}</span> 件
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleSeed} disabled={pending}>
              🌱 初期データ投入
            </Button>
            <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
              + 新規追加
            </Button>
          </div>
        </div>
      </section>

      {templates.length > 0 && (
        <ul className="space-y-3">
          {templates.map((t) => (
            <li key={t.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-medium">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-gray-700 mt-1">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(t)}>
                    編集
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(t)} disabled={pending}>
                    削除
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} size="lg">
        <DialogHeader title="テンプレートを新規登録" onClose={() => setCreateOpen(false)} />
        <DialogBody>
          <TemplateForm onSuccess={() => setCreateOpen(false)} />
        </DialogBody>
      </Dialog>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} size="lg">
        <DialogHeader title={`${editing?.name ?? ''} を編集`} onClose={() => setEditing(null)} />
        <DialogBody>
          {editing && (
            <TemplateForm
              initial={{
                id: editing.id,
                name: editing.name,
                description: editing.description,
              }}
              onSuccess={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </DialogBody>
      </Dialog>
    </>
  );
}
