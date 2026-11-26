import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

interface IHistoryProps { path: string; sessionId: string | null; cwd?: string }
interface IPendingPage { page?: IHistoryPage; resolve: () => void }

const fetchHistory = async (url: string): Promise<IHistoryPage> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('history-read-failed');
  return res.json();
};

const History = ({ path, sessionId, cwd }: IHistoryProps) => {
  const t = useTranslations('common');
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const pendingRef = useRef<IPendingPage | null>(null);
  const mountedRef = useRef(true);
  const query = (beforeByte: number) => new URLSearchParams({ jsonlPath: path, beforeByte: String(beforeByte), limit: '64' });
  // Codex history pages include the newer entries so tools and their results stay paired.
  const { data, error, mutate, isValidating } = useSWR<IHistoryPage>(
    `/api/timeline/entries?${query(Number.MAX_SAFE_INTEGER)}`, fetchHistory,
    { revalidateOnFocus: false, compare: (previous, next) => previous === next },
  );

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (pending?.page && pending.page === data) {
      pendingRef.current = null;
      pending.resolve();
    }
  }, [data]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingRef.current?.resolve();
      pendingRef.current = null;
    };
  }, []);

  const loadMore = (): Promise<void> => {
    if (!data?.hasMore || pendingRef.current || isValidating) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const pending: IPendingPage = { resolve };
      pendingRef.current = pending;
      setLoadMoreError(false);
      setLoadingMore(true);
      void fetchHistory(`/api/timeline/entries?${query(data.startByteOffset)}`).then((page) => {
        if (pendingRef.current !== pending) return;
        if (page === data) {
          pendingRef.current = null;
          resolve();
          return;
        }
        pending.page = page;
        void mutate(page, { revalidate: false });
      }).catch(() => {
        if (pendingRef.current !== pending) return;
        pendingRef.current = null;
        setLoadMoreError(true);
        resolve();
      });
    }).then(() => { if (mountedRef.current) setLoadingMore(false); });
  };
  return <>
    <Button variant="ghost" size="sm" className="self-end" disabled={isValidating || loadingMore} onClick={() => { setLoadMoreError(false); void mutate(); }}>{t('refresh')}</Button>
    {loadMoreError && <p role="alert" className="text-sm text-destructive">{t('error')}</p>}
    <div className="min-h-0 flex-1 overflow-hidden">
      <TimelineView entries={data?.entries ?? []} tasks={[]} sessionId={sessionId} cwd={cwd}
        cliState="inactive" wsStatus="connected" isLoading={!data && !error} error={error ? t('error') : null}
        hasMore={!!data?.hasMore && !isValidating}
        onLoadMore={loadMore}
        onRetry={() => void mutate()} />
    </div>
  </>;
};

export default function ChildSessionHistory(props: IHistoryProps) {
  return <History key={props.path} {...props} />;
}
