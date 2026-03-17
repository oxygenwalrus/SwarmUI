import { useState, useEffect, useRef, useCallback } from 'react';
import * as Comlink from 'comlink';

type WorkerApi = {
    [key: string]: (...args: unknown[]) => unknown;
};

/**
 * Generic hook to communicate with a web worker
 */
export function useWorker<T extends WorkerApi>(
    workerFactory: () => Worker
): {
    worker: Comlink.Remote<T> | null;
    loading: boolean;
    error: Error | null;
    terminate: () => void;
} {
    const workerRef = useRef<Worker | null>(null);
    const proxyRef = useRef<Comlink.Remote<T> | null>(null);
    const [worker, setWorker] = useState<Comlink.Remote<T> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        try {
            workerRef.current = workerFactory();
            const proxy = Comlink.wrap<T>(workerRef.current);
            proxyRef.current = proxy;
            setWorker(proxy);
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to create worker'));
            setLoading(false);
        }

        return () => {
            workerRef.current?.terminate();
        };
    }, [workerFactory]);

    const terminate = useCallback(() => {
        workerRef.current?.terminate();
        workerRef.current = null;
        proxyRef.current = null;
        setWorker(null);
    }, []);

    return {
        worker,
        loading,
        error,
        terminate,
    };
}

/**
 * Hook for using the list filter worker
 */
export function useListFilterWorker() {
    return useWorker(() =>
        new Worker(new URL('../workers/listFilter.worker.ts', import.meta.url), { type: 'module' })
    );
}

/**
 * Hook for filtering a list with the worker
 */
export function useWorkerFilter<T extends Record<string, unknown>>(
    items: T[],
    query: string,
    fields: (keyof T)[],
    sortBy?: keyof T,
    sortOrder: 'asc' | 'desc' = 'asc'
) {
    const [result, setResult] = useState<T[]>(items);
    const [filtering, setFiltering] = useState(false);
    const workerRef = useRef<Worker | null>(null);
    const proxyRef = useRef<Comlink.Remote<unknown> | null>(null);

    // Initialize worker
    useEffect(() => {
        try {
            workerRef.current = new Worker(
                new URL('../workers/listFilter.worker.ts', import.meta.url),
                { type: 'module' }
            );
            proxyRef.current = Comlink.wrap(workerRef.current);
        } catch (err) {
            console.error('Failed to create list filter worker:', err);
        }

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // Filter when dependencies change
    useEffect(() => {
        const filterAsync = async () => {
            if (!proxyRef.current || items.length === 0) {
                setResult(items);
                return;
            }

            // For small lists, filter synchronously
            if (items.length < 100) {
                const filtered = filterSync(items, query, fields, sortBy, sortOrder);
                setResult(filtered);
                return;
            }

            setFiltering(true);
            try {
                // Cast to the expected worker interface for filterItems
                type ListFilterWorker = {
                    filterItems: (args: {
                        items: T[];
                        query: string;
                        fields: (keyof T)[];
                        sortBy?: keyof T;
                        sortOrder: 'asc' | 'desc';
                    }) => Promise<T[]>;
                };
                const filtered = await (proxyRef.current as unknown as ListFilterWorker).filterItems({
                    items,
                    query,
                    fields,
                    sortBy,
                    sortOrder,
                });
                setResult(filtered);
            } catch (err) {
                console.error('Worker filter failed:', err);
                // Fallback to sync filter
                const filtered = filterSync(items, query, fields, sortBy, sortOrder);
                setResult(filtered);
            } finally {
                setFiltering(false);
            }
        };

        filterAsync();
    }, [items, query, fields, sortBy, sortOrder]);

    return { result, filtering };
}

/**
 * Synchronous filter for small lists or fallback
 */
function filterSync<T extends Record<string, unknown>>(
    items: T[],
    query: string,
    fields: (keyof T)[],
    sortBy?: keyof T,
    sortOrder: 'asc' | 'desc' = 'asc'
): T[] {
    if (!query.trim()) {
        if (sortBy) {
            return [...items].sort((a, b) => {
                const aVal = a[sortBy];
                const bVal = b[sortBy];
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortOrder === 'asc'
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }
                return 0;
            });
        }
        return items;
    }

    const queryLower = query.toLowerCase();
    return items.filter(item => {
        for (const field of fields) {
            const value = item[field];
            if (typeof value === 'string' && value.toLowerCase().includes(queryLower)) {
                return true;
            }
        }
        return false;
    });
}
