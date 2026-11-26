import { mutate } from 'swr';

export const invalidateSessionLists = async (): Promise<void> => {
  // Clear inactive keys too; revalidation alone leaves closed project lists stale.
  await mutate(
    (key) => Array.isArray(key) ? key[0] === 'new-tab-sessions' : typeof key === 'string'
      && (key.startsWith('/api/codex/sessions?') || key.startsWith('/api/timeline/sessions?')),
    undefined,
    { revalidate: true },
  );
};
