/**
 * 读取部署用的 basePath（子路径挂载点）。
 *
 * 配置文件优先级：
 *   1. <appDir>/purplemux.config.json 的 basePath
 *   2. ~/.purplemux/config.json 的 basePath（用户级覆盖）
 *   3. 空字符串 = 部署在域名根路径（默认，行为与历史版本一致）
 *
 * basePath 由 Next 在构建期固化，运行期必须以实际运行的构建产物为准，
 * 否则会出现「WebSocket 用新前缀、Next 页面路由用旧前缀」的错配。
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

function normalizeBasePath(value) {
  if (typeof value !== 'string') return '';
  let s = value.trim();
  if (!s || s === '/') return '';
  if (!s.startsWith('/')) s = `/${s}`;
  return s.replace(/\/+$/, '');
}

function readBasePath(root = process.cwd()) {
  const candidates = [
    path.join(root, 'purplemux.config.json'),
    path.join(os.homedir(), '.purplemux', 'config.json'),
  ];
  for (const file of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && typeof parsed.basePath === 'string') {
        return normalizeBasePath(parsed.basePath);
      }
    } catch {
      /* 文件不存在或不是合法 JSON：跳过 */
    }
  }
  return '';
}

/**
 * 从构建产物里读取 Next 固化的 basePath。
 * 找不到（或产物里没有 basePath 字段）时返回 undefined，表示「没有构建产物信息」。
 *
 * @param {string} appDir 实际运行 standalone 产物的目录
 */
function readBakedBasePath(appDir = process.cwd()) {
  const candidates = [
    // 生产：standalone 产物自带 required-server-files.json（npm 包只发布 .next/standalone/）
    path.join(appDir, '.next', 'standalone', '.next', 'required-server-files.json'),
    // 非 standalone 构建或开发期残留产物
    path.join(appDir, '.next', 'required-server-files.json'),
  ];
  for (const file of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      const baked = parsed?.config?.basePath;
      if (typeof baked === 'string') return normalizeBasePath(baked);
    } catch {
      /* 产物不存在或不是合法 JSON：继续尝试下一个候选路径 */
    }
  }
  return undefined;
}

/**
 * 解析运行期应使用的 basePath。
 *
 * @param {string} appDir 读取配置文件的目录（生产为安装目录，开发为仓库根目录）
 * @param {{ useBuildArtifact?: boolean, artifactDir?: string }} options
 *   artifactDir：读取构建产物的目录，默认与 appDir 相同。
 *   Electron 下配置文件在 asar 内、产物在 asar.unpacked，两者可能不同。
 *   useBuildArtifact=false 时只认配置文件（开发期 Next 会重新读取 next.config，
 *   此时引用上一次构建的产物反而会造成前后端不一致）。
 * @returns {{ basePath: string, baked: string | undefined, configured: string }}
 */
function resolveBasePath(appDir = process.cwd(), options = {}) {
  const useBuildArtifact = options.useBuildArtifact !== false;
  const baked = useBuildArtifact ? readBakedBasePath(options.artifactDir || appDir) : undefined;
  const configured = readBasePath(appDir);
  return { basePath: baked ?? configured, baked, configured };
}

module.exports = { readBasePath, readBakedBasePath, resolveBasePath, normalizeBasePath };
