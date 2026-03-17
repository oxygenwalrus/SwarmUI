/**
 * useDeferredSearch Hook
 * 
 * React 19 optimization hook that uses useDeferredValue for search inputs.
 * Keeps the input responsive while deferring expensive filtering operations.
 */

import { useState, useDeferredValue, useMemo, useTransition } from 'react';

interface UseDeferredSearchOptions<T> {
    /** Fields to search in (for object arrays) */
    searchFields?: (keyof T)[];
    /** Custom filter function */
    filterFn?: (item: T, query: string) => boolean;
    /** Minimum query length to start filtering */
    minQueryLength?: number;
}

interface UseDeferredSearchReturn<T> {
    /** Current search query (live) */
    query: string;
    /** Set search query */
    setQuery: (value: string) => void;
    /** Deferred query value (lags behind for performance) */
    deferredQuery: string;
    /** Filtered results using deferred value */
    results: T[];
    /** Whether a transition is pending */
    isPending: boolean;
    /** Clear the search */
    clear: () => void;
}

/**
 * Hook for search inputs with React 19's useDeferredValue
 * 
 * @example
 * const { query, setQuery, results, isPending } = useDeferredSearch(models, {
 *   searchFields: ['name', 'title', 'description']
 * });
 */
export function useDeferredSearch<T>(
    items: T[],
    options: UseDeferredSearchOptions<T> = {}
): UseDeferredSearchReturn<T> {
    const {
        searchFields,
        filterFn,
        minQueryLength = 0,
    } = options;

    const [query, setQuery] = useState('');
    const [isPending, startTransition] = useTransition();

    // Use React 19's useDeferredValue for the search query
    const deferredQuery = useDeferredValue(query);

    // Filtered results using the deferred query
    const results = useMemo(() => {
        const searchTerm = deferredQuery.toLowerCase().trim();

        // Return all items if query is too short
        if (searchTerm.length < minQueryLength) {
            return items;
        }

        // No search term - return all
        if (!searchTerm) {
            return items;
        }

        // Use custom filter function if provided
        if (filterFn) {
            return items.filter(item => filterFn(item, searchTerm));
        }

        // Default: search in specified fields (for object arrays)
        if (searchFields && searchFields.length > 0) {
            return items.filter(item => {
                return searchFields.some(field => {
                    const value = (item as Record<string, unknown>)[field as string];
                    if (typeof value === 'string') {
                        return value.toLowerCase().includes(searchTerm);
                    }
                    return false;
                });
            });
        }

        // Fallback for string arrays
        if (items.length > 0 && typeof items[0] === 'string') {
            return items.filter(item =>
                (item as unknown as string).toLowerCase().includes(searchTerm)
            );
        }

        return items;
    }, [items, deferredQuery, searchFields, filterFn, minQueryLength]);

    const clear = () => {
        startTransition(() => {
            setQuery('');
        });
    };

    return {
        query,
        setQuery,
        deferredQuery,
        results,
        isPending,
        clear,
    };
}

/**
 * Hook for non-blocking state updates using useTransition
 * 
 * Use this for state updates that trigger expensive re-renders
 */
export function useDeferredState<T>(initialValue: T) {
    const [value, setValue] = useState(initialValue);
    const [isPending, startTransition] = useTransition();
    const deferredValue = useDeferredValue(value);

    const setDeferredValue = (newValue: T | ((prev: T) => T)) => {
        startTransition(() => {
            setValue(newValue);
        });
    };

    return {
        value,
        setValue: setDeferredValue,
        deferredValue,
        isPending,
    };
}

export default useDeferredSearch;
