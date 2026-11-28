/**
 * 子路径部署支持：应用里写死的根绝对路径（fetch('/api/...')、
 * window.location.href='/login'、new WebSocket('.../api/...') 等）需要统一加前缀；
 * basePath 本身只影响 Next 自己的链接与静态资源。
 *
 * 前缀的来源分两侧，两者必须一致：
 *   - Next 构建出的客户端 / 服务端 bundle：process.env.NEXT_PUBLIC_BASE_PATH
 *     被构建期内联成字面量（next.config.ts 的 env 配置）。
 *   - 独立 tsup 打包的自定义服务端：Next 的内联不生效，只能读运行期的
 *     process.env.NEXT_PUBLIC_BASE_PATH —— 由 server.ts 从「实际运行的构建产物」
 *     写入，保证自定义服务端与 Next 侧使用同一个前缀。
 */
const normalize = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '');
};

/** 当前部署使用的 basePath；未配置子路径时为空字符串（部署在域名根路径）。 */
export const getBasePath = (): string => normalize(process.env.NEXT_PUBLIC_BASE_PATH ?? '');

export function withBase(path: string): string {
  const base = getBasePath();
  if (!base) return path;
  // 只处理站点根相对路径。相对路径（'api/x'）、协议相对地址（'//host/x'）
  // 与绝对地址（'https://host/x'）都不是应用内部路径，不能加前缀。
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}

/** 去掉 basePath 前缀，得到应用内部使用的路径（没有前缀时原样返回）。 */
export function withoutBase(path: string): string {
  const base = getBasePath();
  if (!base) return path;
  if (path === base) return '/';
  return path.startsWith(`${base}/`) ? path.slice(base.length) || '/' : path;
}

/**
 * 给同源地址加前缀；跨域地址原样返回。
 * 运行时 shim 会拦截页面上的所有 fetch/WebSocket/EventSource，
 * 跨域请求的 pathname 不能被改写，否则会请求到不存在的地址。
 */
const httpOrigin = (origin: string): string =>
  origin.replace(/^ws(s)?:\/\//i, (_match, secure: string | undefined) =>
    (secure ? 'https://' : 'http://'));

const withBaseSameOrigin = (url: URL, origin: string): URL => {
  // WebSocket 的 origin 协议是 ws:/wss:，与页面的 http:/https: 不同，
  // 直接比较会把同源的 ws:// 请求误判成跨域，导致漏加前缀。
  if (httpOrigin(url.origin) !== httpOrigin(origin)) return url;
  const patched = withBase(url.pathname);
  if (patched === url.pathname) return url;
  url.pathname = patched;
  return url;
};

/** 在浏览器端安装 fetch / WebSocket / EventSource 的前缀 shim（只做一次）。 */
export function installBasePathShim(): void {
  const base = getBasePath();
  if (!base || typeof window === 'undefined') return;
  const w = window as typeof window & { __pmuxBaseShimmed?: boolean };
  if (w.__pmuxBaseShimmed) return;
  w.__pmuxBaseShimmed = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      // 字符串输入按站点根相对路径处理；绝对地址（'https://…'）不受影响。
      input = withBase(input);
    } else if (input instanceof URL) {
      input = withBaseSameOrigin(new URL(input.toString()), window.location.origin);
    } else if (input instanceof Request) {
      const u = new URL(input.url);
      const original = u.href;
      const patched = withBaseSameOrigin(u, window.location.origin);
      if (patched.href !== original) {
        input = new Request(patched.toString(), input);
      }
    }
    return nativeFetch(input, init);
  }) as typeof window.fetch;

  const NativeWS = window.WebSocket;
  const WrappedWS = function (url: string | URL, protocols?: string | string[]) {
    let target = String(url);
    try {
      const u = new URL(target, window.location.href);
      target = withBaseSameOrigin(u, window.location.origin).href;
    } catch {
      /* 保持原样 */
    }
    return new NativeWS(target, protocols as string | string[] | undefined);
  } as unknown as typeof WebSocket;
  WrappedWS.prototype = NativeWS.prototype;
  Object.assign(WrappedWS, {
    CONNECTING: NativeWS.CONNECTING, OPEN: NativeWS.OPEN,
    CLOSING: NativeWS.CLOSING, CLOSED: NativeWS.CLOSED,
  });
  window.WebSocket = WrappedWS;

  const NativeES = window.EventSource;
  if (NativeES) {
    window.EventSource = function (url: string | URL, init?: EventSourceInit) {
      let target = String(url);
      try {
        const u = new URL(target, window.location.href);
        target = withBaseSameOrigin(u, window.location.origin).href;
      } catch {
        /* 保持原样 */
      }
      return new NativeES(target, init);
    } as unknown as typeof EventSource;
    window.EventSource.prototype = NativeES.prototype;
  }
}
