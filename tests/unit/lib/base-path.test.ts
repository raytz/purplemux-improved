import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBasePath, withBase, withoutBase } from '@/lib/base-path';

afterEach(() => vi.unstubAllEnvs());

describe('base path prefixing', () => {
  it('keeps root paths untouched when no sub-path is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
    expect(getBasePath()).toBe('');
    expect(withBase('/api/uploads/a.png')).toBe('/api/uploads/a.png');
    expect(withoutBase('/api/uploads/a.png')).toBe('/api/uploads/a.png');
  });

  it('prefixes root absolute paths with the configured sub-path', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/purplemux');
    expect(withBase('/api/uploads/a.png')).toBe('/purplemux/api/uploads/a.png');
    expect(withBase('/login')).toBe('/purplemux/login');
  });

  it('never prefixes a path twice', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/purplemux');
    expect(withBase('/purplemux/api/uploads/a.png')).toBe('/purplemux/api/uploads/a.png');
    expect(withBase('/purplemux')).toBe('/purplemux');
  });

  it('leaves relative paths alone', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/purplemux');
    expect(withBase('api/uploads/a.png')).toBe('api/uploads/a.png');
  });

  it('leaves protocol-relative and absolute URLs alone', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/purplemux');
    expect(withBase('//cdn.example.com/a.png')).toBe('//cdn.example.com/a.png');
    expect(withBase('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });

  it('normalizes malformed base path values', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', 'purplemux/');
    expect(getBasePath()).toBe('/purplemux');
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/');
    expect(getBasePath()).toBe('');
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '   ');
    expect(getBasePath()).toBe('');
  });

  it('strips the prefix back off for internal application paths', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/purplemux');
    expect(withoutBase('/purplemux/api/uploads/a.png')).toBe('/api/uploads/a.png');
    expect(withoutBase('/purplemux')).toBe('/');
    expect(withoutBase('/purplemuxology/api')).toBe('/purplemuxology/api');
    expect(withoutBase('/api/uploads/a.png')).toBe('/api/uploads/a.png');
  });
});
