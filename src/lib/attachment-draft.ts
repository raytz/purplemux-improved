import { isUploadImageUrl } from '@/lib/upload-image-url';

export interface IAttachmentDraft {
  id: string;
  path: string;
  filename: string;
  thumbnail: string;
}

const key = (tabId: string) => `pt-attachment-draft:${tabId}`;

export const loadAttachmentDraft = (tabId?: string): IAttachmentDraft[] => {
  if (!tabId) return [];
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key(tabId)) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is IAttachmentDraft => item &&
      typeof item.id === 'string' && typeof item.path === 'string' &&
      typeof item.filename === 'string' && typeof item.thumbnail === 'string' &&
      // 子路径部署时缩略图地址形如 /purplemux/api/uploads/...，
      // 需要兼容当前 basePath 以及此前保存的根路径草稿。
      isUploadImageUrl(item.thumbnail));
  } catch { return []; }
};

export const saveAttachmentDraft = (tabId: string | undefined, attachments: IAttachmentDraft[]) => {
  if (!tabId) return;
  try {
    if (attachments.length) localStorage.setItem(key(tabId), JSON.stringify(attachments));
    else localStorage.removeItem(key(tabId));
  } catch { /* Storage may be unavailable. */ }
};
