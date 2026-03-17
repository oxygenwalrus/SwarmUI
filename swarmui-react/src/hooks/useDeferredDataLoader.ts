import { useState, useEffect, useCallback, useTransition, useRef } from 'react';

/**
 * Priority levels for deferred data loading
 * - high: Load immediately (0ms delay)
 * - normal: Load after a short delay (50ms)
 * - low: Load after UI is stable (150ms)
 */
export type LoadPriority = 'high' | 'normal' | 'low';

interface DeferredLoaderOptions<T> {
    /** Function that performs the async data loading */
    loadFn: () => Promise<T>;
    /** Priority determines initial delay before loading */
    priority?: LoadPriority;
    /** Use React's startTransition for smoother updates */
    useTransition?: boolean;
    /** Skip initial load (useful for conditional loading) */
    skip?: boolean;
}

interface DeferredLoaderResult<T> {
    /** The loaded data (null until first load completes) */
    data: T | null;
    /** True while loading is in progress */
    loading: boolean;
    /** True if using startTransition and update is pending */
    isPending: boolean;
    /** True if the last load resulted in an error */
    error: Error | null;
    /** Manually trigger a reload */
    reload: () => Promise<void>;
}

const PRIORITY_DELAYS: Record<LoadPriority, number> = {
    high: 0,
    normal: 50,
    low: 150,
};

/**
 * Hook for non-blocking, prioritized data loading.
 * Uses React 18's startTransition to prevent UI blocking during state updates.
 * 
 * @example
 * ```tsx
 * const { data: models, loading } = useDeferredDataLoader({
 *   loadFn: () => swarmClient.listModels(),
 *   priority: 'high',
 * });
 * ```
 */
export function useDeferredDataLoader<T>(
    options: DeferredLoaderOptions<T>
): DeferredLoaderResult<T> {
    const {
        loadFn,
        priority = 'normal',
        useTransition: useTransitionOption = true,
        skip = false,
    } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(!skip);
    const [error, setError] = useState<Error | null>(null);
    const [isPending, startTransition] = useTransition();

    // Track if component is mounted to prevent state updates after unmount
    const mountedRef = useRef(true);
    const loadingRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const load = useCallback(async () => {
        if (loadingRef.current || skip) return;
        loadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const result = await loadFn();

            if (!mountedRef.current) return;

            if (useTransitionOption) {
                // Use startTransition for smoother updates that don't block UI
                startTransition(() => {
                    setData(result);
                });
            } else {
                setData(result);
            }
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
            loadingRef.current = false;
        }
    }, [loadFn, skip, useTransitionOption]);

    // Initial load with priority-based delay
    useEffect(() => {
        if (skip) return;

        const delay = PRIORITY_DELAYS[priority];
        const timer = setTimeout(load, delay);

        return () => clearTimeout(timer);
    }, [load, priority, skip]);

    const reload = useCallback(async () => {
        loadingRef.current = false; // Reset to allow reload
        await load();
    }, [load]);

    return {
        data,
        loading,
        isPending,
        error,
        reload,
    };
}

/**
 * Hook to load multiple data sources in parallel with different priorities.
 * Useful for loading all page data with proper prioritization.
 * 
 * @example
 * ```tsx
 * const { allLoaded, results } = useParallelDataLoader([
 *   { key: 'models', loadFn: loadModels, priority: 'high' },
 *   { key: 'vaes', loadFn: loadVAEs, priority: 'normal' },
 *   { key: 'loras', loadFn: loadLoRAs, priority: 'low' },
 * ]);
 * ```
 */
export function useParallelDataLoader<T extends Record<string, unknown>>(
    loaders: Array<{
        key: keyof T;
        loadFn: () => Promise<T[keyof T]>;
        priority?: LoadPriority;
    }>
) {
    const results = {} as { [K in keyof T]: DeferredLoaderResult<T[K]> };
    let allLoaded = true;

    for (const loader of loaders) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const result = useDeferredDataLoader({
            loadFn: loader.loadFn as () => Promise<T[keyof T]>,
            priority: loader.priority,
        });

        results[loader.key] = result as DeferredLoaderResult<T[typeof loader.key]>;
        if (result.loading) {
            allLoaded = false;
        }
    }

    return { allLoaded, results };
}
