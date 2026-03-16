type EndpointCounter = Record<string, number>;

export interface PerfDiagnosticsSnapshot {
  startedAt: number;
  apiCallCount: number;
  wsReconnectCount: number;
  wsSessionRecoveries: number;
  longTaskCount: number;
  longestLongTaskMs: number;
  apiByEndpoint: EndpointCounter;
  reconnectByEndpoint: EndpointCounter;
}

const isDev = import.meta.env.DEV;

const state: PerfDiagnosticsSnapshot = {
  startedAt: Date.now(),
  apiCallCount: 0,
  wsReconnectCount: 0,
  wsSessionRecoveries: 0,
  longTaskCount: 0,
  longestLongTaskMs: 0,
  apiByEndpoint: {},
  reconnectByEndpoint: {},
};

let longTaskObserverInitialized = false;

function incrementBucket(bucket: EndpointCounter, key: string): void {
  bucket[key] = (bucket[key] || 0) + 1;
}

function initLongTaskObserver(): void {
  if (!isDev || longTaskObserverInitialized || typeof window === 'undefined') {
    return;
  }

  if (!('PerformanceObserver' in window)) {
    longTaskObserverInitialized = true;
    return;
  }

  try {
    const observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        state.longTaskCount += 1;
        if (entry.duration > state.longestLongTaskMs) {
          state.longestLongTaskMs = entry.duration;
        }
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // longtask is not available in every runtime.
  } finally {
    longTaskObserverInitialized = true;
  }
}

export function recordApiCall(endpoint: string): void {
  if (!isDev) return;
  state.apiCallCount += 1;
  incrementBucket(state.apiByEndpoint, endpoint);
}

export function recordWSReconnect(endpoint: string): void {
  if (!isDev) return;
  state.wsReconnectCount += 1;
  incrementBucket(state.reconnectByEndpoint, endpoint);
}

export function recordWSSessionRecovery(): void {
  if (!isDev) return;
  state.wsSessionRecoveries += 1;
}

export function getPerfDiagnosticsSnapshot(): PerfDiagnosticsSnapshot {
  if (isDev) {
    initLongTaskObserver();
  }
  return {
    ...state,
    apiByEndpoint: { ...state.apiByEndpoint },
    reconnectByEndpoint: { ...state.reconnectByEndpoint },
  };
}

export function resetPerfDiagnostics(): void {
  state.startedAt = Date.now();
  state.apiCallCount = 0;
  state.wsReconnectCount = 0;
  state.wsSessionRecoveries = 0;
  state.longTaskCount = 0;
  state.longestLongTaskMs = 0;
  state.apiByEndpoint = {};
  state.reconnectByEndpoint = {};
}

if (isDev) {
  initLongTaskObserver();
}

