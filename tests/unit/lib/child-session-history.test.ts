// @vitest-environment jsdom
import { act, createElement, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/dynamic', async () => {
  const timeline = await import('@/components/features/timeline/timeline-view');
  return { default: () => timeline.default };
});
vi.mock('use-stick-to-bottom', () => ({
  useStickToBottom: () => ({ scrollRef: useRef(null), contentRef: useRef(null), scrollToBottom: () => {} }),
}));
vi.mock('@/components/features/timeline/user-message-item', () => ({
  default: ({ entry }: { entry: { text: string } }) => createElement('div', { 'data-message': entry.text }, entry.text),
}));
import ChildSessionHistory from '@/components/features/workspace/child-session-history';

type Page = { entries: { id: string; type: 'user-message'; timestamp: number; text: string }[]; startByteOffset: number; hasMore: boolean };
const page = (messages: string[], startByteOffset: number, hasMore = true): Page => ({
  entries: messages.map((text, index) => ({ id: text, type: 'user-message', timestamp: index, text })),
  startByteOffset, hasMore,
});
const response = (data: Page) => ({ ok: true, json: async () => data });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

let root: Root;
let container: HTMLDivElement;
const fetchMock = vi.fn();
const render = (path = '/child.jsonl') => act(async () => {
  root.render(createElement(SWRConfig, { value: { provider: () => new Map(), dedupingInterval: 0 } },
    createElement(ChildSessionHistory, { path, sessionId: path })));
});
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
const loadMore = () => [...container.querySelectorAll('button')].find(button => button.textContent?.includes('loadMore'));

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('CSS', { supports: () => false });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(callback, 0));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  fetchMock.mockReset();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe('child session history pagination', () => {
  it('keeps manual scroll anchoring until the older page is rendered', async () => {
    const pending = deferred<ReturnType<typeof response>>();
    fetchMock.mockResolvedValueOnce(response(page(['new'], 100))).mockReturnValueOnce(pending.promise);
    await render(); await flush();
    const scroller = container.querySelector('[role="log"]') as HTMLElement;
    expect(scroller).toBeTruthy();
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, get: () => container.querySelectorAll('[data-message]').length * 400 + 600 });
    scroller.scrollTop = 100;
    await act(async () => { loadMore()!.click(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1][0]), 'http://localhost').searchParams.get('beforeByte')).toBe('100');
    expect(scroller.scrollTop).toBe(100);
    expect(loadMore()).toBeUndefined();
    expect([...container.querySelectorAll('button')].find(button => button.textContent === 'refresh')?.disabled).toBe(true);
    await act(async () => { pending.resolve(response(page(['old', 'new'], 0, false))); await pending.promise; });
    await flush();
    expect([...container.querySelectorAll('[data-message]')].map(el => el.textContent)).toEqual(['old', 'new']);
    expect(scroller.scrollTop).toBe(500);
  });

  it('keeps existing history and retries after a failed page', async () => {
    fetchMock.mockResolvedValueOnce(response(page(['new'], 100)))
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response(page(['old', 'new'], 0, false)));
    await render(); await flush();
    await act(async () => { loadMore()!.click(); }); await flush();
    expect(container.querySelector('[data-message="new"]')).toBeTruthy();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('error');
    expect(loadMore()).toBeTruthy();
    await act(async () => { loadMore()!.click(); }); await flush();
    expect(container.querySelector('[data-message="old"]')).toBeTruthy();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('ignores an old page after switching sessions', async () => {
    const pending = deferred<ReturnType<typeof response>>();
    fetchMock.mockResolvedValueOnce(response(page(['first'], 100))).mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(response(page(['second'], 200, false)));
    await render('/first'); await flush();
    await act(async () => { loadMore()!.click(); });
    await render('/second'); await flush();
    await act(async () => { pending.resolve(response(page(['stale', 'first'], 0, false))); await pending.promise; });
    await flush();
    expect(container.querySelector('[data-message="second"]')).toBeTruthy();
    expect(container.querySelector('[data-message="stale"]')).toBeNull();
  });

  it('refreshes from the newest history after loading an older page', async () => {
    fetchMock.mockResolvedValueOnce(response(page(['new'], 100)))
      .mockResolvedValueOnce(response(page(['old', 'new'], 0, false)))
      .mockResolvedValueOnce(response(page(['latest'], 150)));
    await render(); await flush();
    await act(async () => { loadMore()!.click(); }); await flush();
    await act(async () => { [...container.querySelectorAll('button')].find(button => button.textContent === 'refresh')!.click(); });
    await flush();
    expect(new URL(String(fetchMock.mock.calls[2][0]), 'http://localhost').searchParams.get('beforeByte')).toBe(String(Number.MAX_SAFE_INTEGER));
    expect(container.querySelector('[data-message="latest"]')).toBeTruthy();
    expect(container.querySelector('[data-message="old"]')).toBeNull();
  });

  it('finishes loading if the requested page contains identical data', async () => {
    fetchMock.mockResolvedValueOnce(response(page(['new'], 100)))
      .mockResolvedValueOnce(response(page(['new'], 100)));
    await render(); await flush();
    await act(async () => { loadMore()!.click(); }); await flush();
    expect(loadMore()).toBeTruthy();
    expect(container.querySelector('[data-message="new"]')).toBeTruthy();
  });
});
