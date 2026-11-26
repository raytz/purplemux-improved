import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import type { ITimelineEntry } from '@/types/timeline';

const TimelineView = dynamic(() => import('@/components/features/timeline/timeline-view'), { ssr: false });

interface IHistoryPage {
  entries: ITimelineEntry[];
  startByteOffset: number;
  hasMore: boolean;
}

export default function ChildSessionHistory({ path, sessionId, cwd }: { path: string; sessionId: string | null; cwd?: string }) {
  const t = useTranslations('common');
  const [beforeByte, setBeforeByte] = useState(Number.MAX_SAFE_INTEGER);
  const query = new URLSearchParams({ jsonlPath: path, beforeByte: String(beforeByte), limit: '64' });
  // Codex history pages include the newer entries so tools and their results stay paired.
  const { data, error, mutate, isValidating } = useSWR<IHistoryPage>(`/api/timeline/entries?${query}`, async url => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('history-read-failed');
    return res.json();
  }, { keepPreviousData: true, revalidateOnFocus: false });
  return <>
    <Button variant="ghost" size="sm" className="self-end" disabled={isValidating} onClick={() => void mutate()}>{t('refresh')}</Button>
    <div className="min-h-0 flex-1 overflow-hidden">
      <TimelineView entries={data?.entries ?? []} tasks={[]} sessionId={sessionId} cwd={cwd}
        cliState="inactive" wsStatus="connected" isLoading={!data && !error} error={error ? t('error') : null}
        hasMore={!!data?.hasMore && !isValidating}
        onLoadMore={async () => { if (data?.hasMore) setBeforeByte(data.startByteOffset); }}
        onRetry={() => void mutate()} />
    </div>
  </>;
}
