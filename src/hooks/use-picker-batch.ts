import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import useNewTabActionStore from '@/hooks/use-new-tab-action-store';
import { invalidateSessionLists } from '@/lib/session-list-cache';
import type { INewTabSession } from '@/lib/new-tab-sessions';

export default function usePickerBatch(workspaceId: string | null) {
  const t = useTranslations('session');
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<INewTabSession[] | null>(null);
  const [original, setOriginal] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearSelection() {
    setSelected(new Set());
    setConfirming(null);
    setErrors({});
  }

  function toggle(key: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function execute() {
    if (!workspaceId || !confirming?.length || !useNewTabActionStore.getState().start(workspaceId, 'batch-delete')) return;
    const succeeded: string[] = [];
    const failed: Record<string, string> = {};
    try {
      for (const { key, target } of confirming) {
        try {
          const response = await fetch('/api/session-history', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: target.providerId, sessionId: target.agentSessionId, deleteOriginal: original }),
          });
          if (response.ok) succeeded.push(key);
          else failed[key] = t(response.status === 409 ? 'deleteSessionInUse' : 'deleteFailed');
        } catch {
          failed[key] = t('deleteFailed');
        }
      }
      setRemoved(current => new Set([...current, ...succeeded]));
      setErrors(failed);
      setSelected(new Set(Object.keys(failed)));
      setConfirming(null);
      const failureCount = Object.keys(failed).length;
      const message = t('batch.result', { success: succeeded.length, failed: failureCount });
      if (failureCount) toast.error(message);
      else toast.success(message);
      if (succeeded.length) await invalidateSessionLists();
    } finally {
      useNewTabActionStore.getState().finish(workspaceId);
    }
  }

  return {
    managing, selected, removed, confirming, original, errors, clearSelection, toggle, setSelected, setOriginal, execute,
    toggleManaging() { clearSelection(); setManaging(!managing); },
    confirm(items: INewTabSession[]) { setOriginal(true); setConfirming(items); },
    cancel() { setConfirming(null); },
  };
}
