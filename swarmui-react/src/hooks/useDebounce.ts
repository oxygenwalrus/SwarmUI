import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounce a value - returns the debounced value that updates after the delay
 * 
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 300);
 * 
 * // Use debouncedQuery for API calls
 * useEffect(() => {
 *   if (debouncedQuery) {
 *     fetchResults(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Create a debounced version of a callback function
 * 
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   fetchResults(query);
 * }, 300);
 * 
 * // Call handleSearch on every keystroke - it will only execute after 300ms of no calls
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const callbackRef = useRef(callback);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return useCallback((...args: Parameters<T>) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);
}

/**
 * Returns a debounced setter for state updates
 * Useful when you want immediate local state but debounced side effects
 * 
 * @example
 * ```tsx
 * const [value, setValue, debouncedValue] = useDebouncedState('', 300);
 * 
 * // setValue updates immediately, debouncedValue updates after 300ms
 * <input value={value} onChange={(e) => setValue(e.target.value)} />
 * 
 * useEffect(() => {
 *   // This runs 300ms after the last change
 *   saveToServer(debouncedValue);
 * }, [debouncedValue]);
 * ```
 */
export function useDebouncedState<T>(
    initialValue: T,
    delay: number
): [T, (value: T) => void, T] {
    const [value, setValue] = useState<T>(initialValue);
    const debouncedValue = useDebounce(value, delay);

    return [value, setValue, debouncedValue];
}

/**
 * Throttle a callback - executes at most once per interval
 * Unlike debounce, throttle executes the first call immediately
 * 
 * @example
 * ```tsx
 * const handleScroll = useThrottledCallback(() => {
 *   updateScrollPosition();
 * }, 100);
 * 
 * <div onScroll={handleScroll} />
 * ```
 */
export function useThrottledCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
    callback: T,
    interval: number
): (...args: Parameters<T>) => void {
    const callbackRef = useRef(callback);
    const lastCallRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return useCallback((...args: Parameters<T>) => {
        const now = Date.now();
        const timeSinceLastCall = now - lastCallRef.current;

        if (timeSinceLastCall >= interval) {
            // Execute immediately
            lastCallRef.current = now;
            callbackRef.current(...args);
        } else {
            // Schedule for later
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                lastCallRef.current = Date.now();
                callbackRef.current(...args);
            }, interval - timeSinceLastCall);
        }
    }, [interval]);
}
