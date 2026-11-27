import { withBase, withoutBase } from '@/lib/base-path';

/** 上传图片接口的应用内部路径前缀（不含 basePath）。 */
export const UPLOAD_IMAGE_PATH_PREFIX = '/api/uploads/';

/** 生成上传图片的对外地址（子路径部署时带 basePath 前缀）。 */
export const buildUploadImageUrl = (segments: string[]): string =>
  withBase(`${UPLOAD_IMAGE_PATH_PREFIX}${segments.map(encodeURIComponent).join('/')}`);

/**
 * 判断一个图片地址是否指向上传接口。
 * 子路径部署时地址形如 /purplemux/api/uploads/...，需要先剥掉前缀再判断，
 * 否则带前缀的地址不会被识别（例如消息匹配时的 imageCount 统计）。
 */
export const isUploadImageUrl = (url: string): boolean =>
  withoutBase(url).startsWith(UPLOAD_IMAGE_PATH_PREFIX);
