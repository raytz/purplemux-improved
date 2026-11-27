// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installBasePathShim } from '@/lib/base-path';

const nativeFetch = globalThis.fetch;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/purplemux');
  vi.stubGlobal('location', { origin: 'https://app.example.com', href: 'https://app.example.com/' });
  (window as unknown as { __pmuxBaseShimmed?: boolean }).__pmuxBaseShimmed = false;
});

afterEach(() => {
  globalThis.fetch = nativeFetch;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('base path runtime shim', () => {
  const fetched = (spy: ReturnType<typeof vi.fn>): unknown => spy.mock.calls[0]?.[0];

  it('prefixes same-origin fetch requests', async () => {
    const spy = vi.fn(() => Promise.resolve(new Response('ok')));
    vi.stubGlobal('fetch', spy);
    installBasePathShim();

    await fetch('/api/config');
    expect(fetched(spy)).toBe('/purplemux/api/config');
  });

  it('does not rewrite cross-origin fetch requests', async () => {
    const spy = vi.fn(() => Promise.resolve(new Response('ok')));
    vi.stubGlobal('fetch', spy);
    installBasePathShim();

    await fetch('https://cdn.example.com/assets/logo.png');
    expect(fetched(spy)).toBe('https://cdn.example.com/assets/logo.png');
  });

  it('does not rewrite cross-origin URL objects', async () => {
    const spy = vi.fn(() => Promise.resolve(new Response('ok')));
    vi.stubGlobal('fetch', spy);
    installBasePathShim();

    await fetch(new URL('https://cdn.example.com/assets/logo.png'));
    expect(fetched(spy)).toBeInstanceOf(URL);
    expect((fetched(spy) as URL).href).toBe('https://cdn.example.com/assets/logo.png');
  });

  it('prefixes same-origin URL objects', async () => {
    const spy = vi.fn(() => Promise.resolve(new Response('ok')));
    vi.stubGlobal('fetch', spy);
    installBasePathShim();

    await fetch(new URL('https://app.example.com/api/config'));
    expect((fetched(spy) as URL).pathname).toBe('/purplemux/api/config');
  });

  it('does not rewrite cross-origin Request objects', async () => {
    const spy = vi.fn(() => Promise.resolve(new Response('ok')));
    vi.stubGlobal('fetch', spy);
    installBasePathShim();

    await fetch(new Request('https://cdn.example.com/assets/logo.png'));
    expect((fetched(spy) as Request).url).toBe('https://cdn.example.com/assets/logo.png');
  });

  it('prefixes same-origin Request objects', async () => {
    const spy = vi.fn(() => Promise.resolve(new Response('ok')));
    vi.stubGlobal('fetch', spy);
    installBasePathShim();

    await fetch(new Request('https://app.example.com/api/config'));
    expect((fetched(spy) as Request).url).toBe('https://app.example.com/purplemux/api/config');
  });
});
