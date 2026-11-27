import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUploadImageUrl, isUploadImageUrl } from '@/lib/upload-image-url';

afterEach(() => vi.unstubAllEnvs());

describe('upload image URLs', () => {
  it('builds root paths when no sub-path is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
    expect(buildUploadImageUrl(['ws-1', 'tab-1', 'image name.png']))
      .toBe('/api/uploads/ws-1/tab-1/image%20name.png');
  });

  it('prefixes the built URL with the configured sub-path', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/purplemux');
    expect(buildUploadImageUrl(['ws-1', 'tab-1', 'image.png']))
      .toBe('/purplemux/api/uploads/ws-1/tab-1/image.png');
  });

  it('recognizes upload URLs with and without the sub-path prefix', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/purplemux');
    expect(isUploadImageUrl('/api/uploads/ws/tab/image.png')).toBe(true);
    expect(isUploadImageUrl('/purplemux/api/uploads/ws/tab/image.png')).toBe(true);
    expect(isUploadImageUrl('/purplemux/api/session-files/ws/report.html')).toBe(false);
    expect(isUploadImageUrl('data:image/png;base64,AAAA')).toBe(false);
  });

  it('does not treat a lookalike prefix as the sub-path', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/purplemux');
    expect(isUploadImageUrl('/purplemuxology/api/uploads/image.png')).toBe(false);
  });
});
