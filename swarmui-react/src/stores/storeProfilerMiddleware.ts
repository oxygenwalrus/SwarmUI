/**
 * Store Profiler Middleware
 * 
 * Zustand middleware for tracking store update performance.
 * Development-only - passes through in production.
 * 
 * @example
 * const useMyStore = create(
 *   storeProfiler('MyStore',
 *     (set, get) => ({
 *       count: 0,
 *       increment: () => set({ count: get().count + 1 }),
 *     })
 *   )
 * );
 */

import { type StateCreator, type StoreMutatorIdentifier } from 'zustand';
import { profiler } from '../utils/performanceProfiler';

const isDev = import.meta.env.DEV;

type StoreProfilerMiddleware = <
    T,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
    storeName: string,
    creator: StateCreator<T, Mps, Mcs>
) => StateCreator<T, Mps, Mcs>;

/**
 * Middleware that profiles all store updates
 */
export const storeProfiler: StoreProfilerMiddleware = (storeName, creator) => (set, get, api) => {
    if (!isDev) {
        return creator(set, get, api);
    }

    let updateCount = 0;
    let lastUpdateTime = Date.now();

    // Wrap set with profiling - use type assertion to handle complex Zustand generics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profiledSet = ((...args: any[]) => {
        updateCount++;
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTime;
        lastUpdateTime = now;

        const timer = profiler.startTimer(`store:${storeName}`);

        // Call the original set with all arguments
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (set as any)(...args);

        timer.end({
            updateNumber: updateCount,
            timeSinceLastUpdate,
        });

        return result;
    }) as typeof set;

    return creator(profiledSet, get, api);
};

/**
 * Track specific actions in a store
 */
export function trackStoreAction<T>(
    storeName: string,
    actionName: string,
    fn: () => T
): T {
    if (!isDev) {
        return fn();
    }

    const timer = profiler.startTimer(`store:${storeName}:${actionName}`);
    try {
        const result = fn();
        timer.end({ action: actionName });
        return result;
    } catch (error) {
        timer.end({ action: actionName, error: true });
        throw error;
    }
}

/**
 * Track async actions in a store
 */
export async function trackStoreActionAsync<T>(
    storeName: string,
    actionName: string,
    fn: () => Promise<T>
): Promise<T> {
    if (!isDev) {
        return fn();
    }

    const timer = profiler.startTimer(`store:${storeName}:${actionName}`);
    try {
        const result = await fn();
        timer.end({ action: actionName });
        return result;
    } catch (error) {
        timer.end({ action: actionName, error: true });
        throw error;
    }
}

export default storeProfiler;
