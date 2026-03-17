/**
 * useRenderProfiler Hook
 * 
 * Track component render counts and timing.
 * Development-only - no-ops in production.
 * 
 * @example
 * function MyComponent() {
 *   useRenderProfiler('MyComponent');
 *   return <div>...</div>;
 * }
 */

import { useRef, useEffect, useLayoutEffect, createElement, type ComponentType } from 'react';
import { profiler } from '../utils/performanceProfiler';
import { usePerformanceStore } from '../stores/performanceStore';

const isDev = import.meta.env.DEV;

interface RenderProfilerOptions {
    /** Warn if render takes longer than this (ms). Default: 16ms (60fps budget) */
    threshold?: number;
    /** Log every render to console. Default: false */
    verbose?: boolean;
    /** Track what triggered re-render. Default: false */
    trackCause?: boolean;
}

/**
 * Hook to profile component renders
 */
export function useRenderProfiler(
    componentName: string,
    options: RenderProfilerOptions = {}
): void {
    if (!isDev) return;

    const { threshold = 16, verbose = false } = options;

    const renderCountRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const recordRender = usePerformanceStore((state) => state.recordRender);

    // Use useLayoutEffect to capture timing at the start of commit phase
    // This runs synchronously after DOM mutations but before paint
    useLayoutEffect(() => {
        startTimeRef.current = performance.now();
        renderCountRef.current += 1;
    });

    useEffect(() => {
        // This runs after render completes
        const renderTime = performance.now() - startTimeRef.current;
        const renderCount = renderCountRef.current;

        // Record in profiler
        profiler.startTimer(`render:${componentName}`).end({
            renderCount,
            duration: renderTime,
        });

        // Record in performance store
        recordRender(componentName, renderTime);

        if (verbose) {
            console.debug(
                `[Render] ${componentName} #${renderCount} took ${renderTime.toFixed(2)}ms`
            );
        }

        if (renderTime > threshold) {
            console.warn(
                `[Render] Slow render: ${componentName} took ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
            );
        }
    });

    // Initial mount log
    useEffect(() => {
        if (verbose) {
            console.debug(`[Render] ${componentName} mounted`);
        }
        return () => {
            if (verbose) {
                console.debug(
                    `[Render] ${componentName} unmounted after ${renderCountRef.current} renders`
                );
            }
        };
    }, [componentName, verbose]);
}

/**
 * Hook to profile renders with props change detection
 */
export function useRenderProfilerWithProps<P extends Record<string, unknown>>(
    componentName: string,
    props: P,
    options: RenderProfilerOptions = {}
): { changedProps: string[] } {
    const prevPropsRef = useRef<P | undefined>(undefined);
    const changedPropsRef = useRef<string[]>([]);

    // Use useEffect to track prop changes (runs after render, safe to access refs)
    useEffect(() => {
        if (isDev && prevPropsRef.current) {
            const changed: string[] = [];
            for (const key of Object.keys(props)) {
                if (prevPropsRef.current[key] !== props[key]) {
                    changed.push(key);
                }
            }
            changedPropsRef.current = changed;

            if (changed.length > 0 && options.trackCause) {
                console.debug(
                    `[Render] ${componentName} re-rendered due to props:`,
                    changed
                );
            }
        }
        prevPropsRef.current = props;
    });

    useRenderProfiler(componentName, options);

    // Return empty array during render (actual values only accessible via ref after effect runs)
    // This avoids reading refs during render while still providing the API
    return { changedProps: isDev ? changedPropsRef.current : [] };
}

/**
 * Higher-order component for class component profiling (legacy support)
 */
export function withRenderProfiler<P extends object>(
    WrappedComponent: ComponentType<P>,
    componentName?: string
) {
    const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

    function ProfiledComponent(props: P) {
        useRenderProfiler(displayName);
        return createElement(WrappedComponent, props);
    }

    ProfiledComponent.displayName = `Profiled(${displayName})`;
    return ProfiledComponent;
}

export default useRenderProfiler;
