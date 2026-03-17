/**
 * useEffectProfiler Hook
 * 
 * Time effect execution for performance monitoring.
 * Development-only - falls back to regular useEffect in production.
 * 
 * @example
 * useEffectProfiler('fetchData', () => {
 *   fetchData();
 *   return () => cleanup();
 * }, [deps]);
 */

import { useEffect, useRef, useLayoutEffect, type DependencyList, type EffectCallback } from 'react';
import { profiler } from '../utils/performanceProfiler';

const isDev = import.meta.env.DEV;

interface EffectProfilerOptions {
    /** Warn if effect takes longer than this (ms). Default: 50ms */
    threshold?: number;
    /** Log every effect run to console. Default: false */
    verbose?: boolean;
}

/**
 * Profile a useEffect with timing
 */
export function useEffectProfiler(
    name: string,
    effect: EffectCallback,
    deps?: DependencyList,
    options: EffectProfilerOptions = {}
): void {
    const { threshold = 50, verbose = false } = options;
    const runCountRef = useRef(0);

    useEffect(() => {
        if (!isDev) {
            return effect();
        }

        runCountRef.current += 1;
        const runCount = runCountRef.current;
        const timer = profiler.startTimer(`effect:${name}`);

        if (verbose) {
            console.debug(`[Effect] ${name} running (#${runCount})`);
        }

        // Run the effect
        const cleanup = effect();

        // End timer and record
        const duration = timer.end({ runCount });

        if (duration > threshold) {
            console.warn(
                `[Effect] Slow effect: ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
            );
        }

        // Wrap cleanup if present
        if (cleanup) {
            return () => {
                if (verbose) {
                    console.debug(`[Effect] ${name} cleanup running`);
                }
                const cleanupTimer = profiler.startTimer(`effect:${name}:cleanup`);
                cleanup();
                cleanupTimer.end();
            };
        }
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/**
 * Profile an async effect (fire-and-forget pattern)
 */
export function useAsyncEffectProfiler(
    name: string,
    asyncEffect: () => Promise<void | (() => void)>,
    deps?: DependencyList,
    options: EffectProfilerOptions = {}
): void {
    const { threshold = 100, verbose = false } = options;
    const runCountRef = useRef(0);

    useEffect(() => {
        let cleanup: (() => void) | void;

        const run = async () => {
            if (!isDev) {
                cleanup = await asyncEffect();
                return;
            }

            runCountRef.current += 1;
            const runCount = runCountRef.current;
            const timer = profiler.startTimer(`async-effect:${name}`);

            if (verbose) {
                console.debug(`[AsyncEffect] ${name} running (#${runCount})`);
            }

            try {
                cleanup = await asyncEffect();
                const duration = timer.end({ runCount, success: true });

                if (duration > threshold) {
                    console.warn(
                        `[AsyncEffect] Slow async effect: ${name} took ${duration.toFixed(2)}ms`
                    );
                }
            } catch (error) {
                timer.end({ runCount, error: true });
                throw error;
            }
        };

        run();

        return () => {
            if (cleanup) {
                if (verbose) {
                    console.debug(`[AsyncEffect] ${name} cleanup running`);
                }
                cleanup();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/**
 * Profile a layout effect
 */
export function useLayoutEffectProfiler(
    name: string,
    effect: EffectCallback,
    deps?: DependencyList,
    options: EffectProfilerOptions = {}
): void {
    const { threshold = 16, verbose = false } = options; // Stricter threshold for layout effects
    const runCountRef = useRef(0);

    // Use imported useLayoutEffect directly - SSR handled by checking isDev flag
    useLayoutEffect(() => {
        if (!isDev) {
            return effect();
        }

        runCountRef.current += 1;
        const runCount = runCountRef.current;
        const timer = profiler.startTimer(`layout-effect:${name}`);

        if (verbose) {
            console.debug(`[LayoutEffect] ${name} running (#${runCount})`);
        }

        const cleanup = effect();
        const duration = timer.end({ runCount });

        if (duration > threshold) {
            console.warn(
                `[LayoutEffect] Slow layout effect: ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
            );
        }

        if (cleanup) {
            return () => {
                if (verbose) {
                    console.debug(`[LayoutEffect] ${name} cleanup running`);
                }
                cleanup();
            };
        }
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export default useEffectProfiler;
