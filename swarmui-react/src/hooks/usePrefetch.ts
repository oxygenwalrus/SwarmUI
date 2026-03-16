/**
 * usePrefetch Hook
 * 
 * Provides intelligent prefetching utilities for links, images, and routes.
 * Prefetches resources on hover intent to enable perceived instant navigation.
 */

import { useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

interface PrefetchOptions {
    /** Delay before triggering prefetch (ms) */
    delay?: number;
    /** Respect user's data-saver preference */
    respectSaveData?: boolean;
}

interface UsePrefetchReturn {
    /** Prefetch a URL (adds <link rel="prefetch">) */
    prefetchUrl: (url: string) => void;
    /** Prefetch multiple images into browser cache */
    prefetchImages: (urls: string[]) => void;
    /** Create hover handlers for prefetch-on-hover behavior */
    createHoverHandlers: (
        onPrefetch: () => void,
        options?: PrefetchOptions
    ) => {
        onMouseEnter: () => void;
        onMouseLeave: () => void;
    };
    /** Cancel any pending prefetch */
    cancelPending: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DELAY = 100; // ms before prefetch triggers
const MAX_CONCURRENT_PREFETCH = 3;

// Track what's already been prefetched to avoid duplicates
const prefetchedUrls = new Set<string>();
const prefetchingImages = new Map<string, HTMLImageElement>();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if user has data-saver mode enabled
 */
function isDataSaverEnabled(): boolean {
    // @ts-expect-error - connection API not in all TypeScript defs
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return connection?.saveData === true;
}

/**
 * Check if the URL is already prefetched
 */
function isAlreadyPrefetched(url: string): boolean {
    return prefetchedUrls.has(url);
}

/**
 * Add a prefetch link to the document head
 */
function addPrefetchLink(url: string, as?: string): void {
    if (isAlreadyPrefetched(url)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    if (as) link.as = as;

    document.head.appendChild(link);
    prefetchedUrls.add(url);
}

/**
 * Prefetch an image using Image() constructor
 */
function prefetchImage(url: string): Promise<void> {
    if (isAlreadyPrefetched(url)) return Promise.resolve();
    if (prefetchingImages.has(url)) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const img = new Image();
        prefetchingImages.set(url, img);

        img.onload = () => {
            prefetchedUrls.add(url);
            prefetchingImages.delete(url);
            resolve();
        };

        img.onerror = () => {
            prefetchingImages.delete(url);
            reject(new Error(`Failed to prefetch: ${url}`));
        };

        img.src = url;
    });
}

/**
 * Cancel an in-progress image prefetch
 */
function cancelImagePrefetch(url: string): void {
    const img = prefetchingImages.get(url);
    if (img) {
        img.src = ''; // Cancel the load
        prefetchingImages.delete(url);
    }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePrefetch(options: PrefetchOptions = {}): UsePrefetchReturn {
    const { delay = DEFAULT_DELAY, respectSaveData = true } = options;

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingUrls = useRef<string[]>([]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            // Cancel pending image prefetches
            pendingUrls.current.forEach(cancelImagePrefetch);
        };
    }, []);

    /**
     * Prefetch a URL resource
     */
    const prefetchUrl = useCallback((url: string) => {
        if (respectSaveData && isDataSaverEnabled()) return;
        addPrefetchLink(url);
    }, [respectSaveData]);

    /**
     * Prefetch multiple images
     */
    const prefetchImages = useCallback((urls: string[]) => {
        if (respectSaveData && isDataSaverEnabled()) return;

        // Limit concurrent prefetches
        const urlsToFetch = urls
            .filter(url => !isAlreadyPrefetched(url))
            .slice(0, MAX_CONCURRENT_PREFETCH);

        pendingUrls.current = urlsToFetch;

        urlsToFetch.forEach(url => {
            prefetchImage(url).catch(() => {
                // Silently fail - prefetch is best-effort
            });
        });
    }, [respectSaveData]);

    /**
     * Create hover handlers for prefetch-on-hover
     */
    const createHoverHandlers = useCallback((
        onPrefetch: () => void,
        handlerOptions?: PrefetchOptions
    ) => {
        const hoverDelay = handlerOptions?.delay ?? delay;

        return {
            onMouseEnter: () => {
                if (respectSaveData && isDataSaverEnabled()) return;

                timeoutRef.current = setTimeout(() => {
                    onPrefetch();
                }, hoverDelay);
            },
            onMouseLeave: () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            },
        };
    }, [delay, respectSaveData]);

    /**
     * Cancel any pending prefetch operations
     */
    const cancelPending = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        pendingUrls.current.forEach(cancelImagePrefetch);
        pendingUrls.current = [];
    }, []);

    return {
        prefetchUrl,
        prefetchImages,
        createHoverHandlers,
        cancelPending,
    };
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Prefetch a route's code chunk (for lazy-loaded components)
 */
export function prefetchRoute(routeImport: () => Promise<unknown>): void {
    if (isDataSaverEnabled()) return;

    // Trigger the dynamic import to load the chunk
    routeImport().catch(() => {
        // Silently fail
    });
}

/**
 * Clear all prefetch tracking (useful for testing)
 */
export function clearPrefetchCache(): void {
    prefetchedUrls.clear();
    prefetchingImages.forEach((_, url) => cancelImagePrefetch(url));
    prefetchingImages.clear();
}

export default usePrefetch;
