import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { swarmClient } from '../api/client';
import { useEntityStore } from './entityStore';
import { useQueueStore } from './queue';

type GenerateCallbacks = Parameters<typeof swarmClient.generateImage>[1];

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function resetStores(): void {
  useEntityStore.getState().reset();
  useQueueStore.setState({
    jobIds: [],
    batchIds: [],
    isProcessing: false,
    isPaused: false,
    runnerStatus: 'idle',
    activeJobId: null,
    activeConnectionId: null,
    runnerVersion: 0,
    selectedJobIds: [],
  });
}

describe('queue runner pause/stop races', () => {
  const originalLocalStorage = globalThis.localStorage;
  let callbacks: GenerateCallbacks[] = [];
  let socketCloseFns: Array<ReturnType<typeof vi.fn>> = [];

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    globalThis.localStorage = new MemoryStorage();
    resetStores();
    callbacks = [];
    socketCloseFns = [];

    vi.useFakeTimers();
    vi.spyOn(swarmClient, 'generateImage').mockImplementation((_params, runtimeCallbacks) => {
      callbacks.push(runtimeCallbacks);
      const close = vi.fn();
      socketCloseFns.push(close);
      return {
        close,
        url: `ws://queue/${callbacks.length}`,
        readyState: 1,
      } as unknown as WebSocket;
    });
  });

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
    resetStores();
  });

  it('pauses after the active job and resumes with the next queued job', () => {
    const firstJobId = useQueueStore.getState().addJob({ prompt: 'job one' });
    const secondJobId = useQueueStore.getState().addJob({ prompt: 'job two' });

    useQueueStore.getState().startRunner();
    expect(swarmClient.generateImage).toHaveBeenCalledTimes(1);
    expect(useQueueStore.getState().activeJobId).toBe(firstJobId);

    useQueueStore.getState().pauseRunner();
    callbacks[0].onComplete?.();

    const jobsAfterPause = useEntityStore.getState().entities.jobs;
    expect(jobsAfterPause[firstJobId]?.status).toBe('completed');
    expect(jobsAfterPause[secondJobId]?.status).toBe('pending');
    expect(useQueueStore.getState().runnerStatus).toBe('paused');
    expect(swarmClient.generateImage).toHaveBeenCalledTimes(1);

    useQueueStore.getState().startRunner();
    expect(useQueueStore.getState().runnerStatus).toBe('running');
    expect(useQueueStore.getState().activeJobId).toBe(secondJobId);
    expect(swarmClient.generateImage).toHaveBeenCalledTimes(2);
  });

  it('cancels the active job on stop and ignores late completion callbacks', async () => {
    const firstJobId = useQueueStore.getState().addJob({ prompt: 'job one' });
    const secondJobId = useQueueStore.getState().addJob({ prompt: 'job two' });

    useQueueStore.getState().startRunner();
    expect(swarmClient.generateImage).toHaveBeenCalledTimes(1);

    useQueueStore.getState().stopRunner();
    expect(socketCloseFns[0]).toHaveBeenCalledTimes(1);

    callbacks[0].onComplete?.();
    await vi.runOnlyPendingTimersAsync();

    const jobsAfterStop = useEntityStore.getState().entities.jobs;
    expect(jobsAfterStop[firstJobId]?.status).toBe('cancelled');
    expect(jobsAfterStop[secondJobId]?.status).toBe('pending');
    expect(useQueueStore.getState().runnerStatus).toBe('idle');
    expect(useQueueStore.getState().activeJobId).toBeNull();
    expect(swarmClient.generateImage).toHaveBeenCalledTimes(1);
  });
});
