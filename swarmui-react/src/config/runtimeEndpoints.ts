export type RuntimeMode = 'vite-proxy' | 'same-origin' | 'direct' | 'custom-url';

export interface RuntimeEndpoints {
  apiBaseUrl: string;
  wsBaseUrl: string;
  assetBaseUrl: string;
  mode: RuntimeMode;
}

const DEFAULT_DIRECT_API = 'http://localhost:7801';

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function toWebSocketUrl(url: string): string {
  return url.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
}

function isLikelyViteHost(host: string): boolean {
  return /^localhost:51\d{2}$/i.test(host) || /^127\.0\.0\.1:51\d{2}$/i.test(host);
}

function joinBaseUrl(base: string, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return cleanPath;
  }
  return `${stripTrailingSlashes(base)}${cleanPath}`;
}

export function resolveRuntimeEndpoints(overrideApiBaseUrl?: string): RuntimeEndpoints {
  const envBaseUrl = (import.meta.env.VITE_SWARMUI_URL as string | undefined)?.trim();
  const forcedBase = overrideApiBaseUrl?.trim();

  const selectedBase = forcedBase || envBaseUrl;
  if (selectedBase) {
    const normalized = stripTrailingSlashes(selectedBase);
    return {
      apiBaseUrl: normalized,
      wsBaseUrl: toWebSocketUrl(normalized),
      assetBaseUrl: normalized,
      mode: 'custom-url',
    };
  }

  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    const origin = stripTrailingSlashes(window.location.origin);
    if (isLikelyViteHost(window.location.host)) {
      return {
        apiBaseUrl: '',
        wsBaseUrl: toWebSocketUrl(origin),
        assetBaseUrl: '',
        mode: 'vite-proxy',
      };
    }

    return {
      apiBaseUrl: origin,
      wsBaseUrl: toWebSocketUrl(origin),
      assetBaseUrl: origin,
      mode: 'same-origin',
    };
  }

  return {
    apiBaseUrl: DEFAULT_DIRECT_API,
    wsBaseUrl: toWebSocketUrl(DEFAULT_DIRECT_API),
    assetBaseUrl: DEFAULT_DIRECT_API,
    mode: 'direct',
  };
}

export function resolveAssetUrl(pathOrUrl: string, endpoints = resolveRuntimeEndpoints()): string {
  if (!pathOrUrl) {
    return pathOrUrl;
  }

  if (
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('blob:') ||
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://')
  ) {
    return pathOrUrl;
  }

  return joinBaseUrl(endpoints.assetBaseUrl, pathOrUrl);
}

export function resolveApiUrl(path: string, endpoints = resolveRuntimeEndpoints()): string {
  return joinBaseUrl(endpoints.apiBaseUrl, path);
}

