import { QueryClient } from '@tanstack/react-query';
import { isElectronRuntimeTarget } from '../config/runtimeTarget';

/**
 * Shared QueryClient instance with optimized defaults for SwarmUI.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data stays fresh for 5 minutes
            staleTime: 5 * 60 * 1000,

            // Keep unused data in cache for 30 minutes
            gcTime: 30 * 60 * 1000,

            // Retry failed requests 2 times
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

            // Refetch on window focus for fresh data
            refetchOnWindowFocus: !isElectronRuntimeTarget,

            // Don't refetch on mount if data is fresh
            refetchOnMount: false,

            // Keep previous data while refetching
            placeholderData: (previousData: unknown) => previousData,
        },
        mutations: {
            // Retry mutations once
            retry: 1,
        },
    },
});

/**
 * Query key factory for consistent cache keys
 */
export const queryKeys = {
    // Models
    models: {
        all: ['models'] as const,
        list: (subtype: string) => ['models', 'list', subtype] as const,
        detail: (name: string) => ['models', 'detail', name] as const,
    },

    // LoRAs
    loras: {
        all: ['loras'] as const,
        list: () => ['loras', 'list'] as const,
        detail: (name: string) => ['loras', 'detail', name] as const,
    },

    // VAEs
    vaes: {
        all: ['vaes'] as const,
        list: () => ['vaes', 'list'] as const,
    },

    // Backends
    backends: {
        all: ['backends'] as const,
        list: () => ['backends', 'list'] as const,
    },

    // Images
    images: {
        all: ['images'] as const,
        list: (path: string) => ['images', 'list', path] as const,
        history: (path: string) => ['images', 'history', path] as const,
    },

    // ControlNets
    controlnets: {
        all: ['controlnets'] as const,
        list: () => ['controlnets', 'list'] as const,
    },

    // Upscalers
    upscalers: {
        all: ['upscalers'] as const,
        list: () => ['upscalers', 'list'] as const,
    },

    // Embeddings
    embeddings: {
        all: ['embeddings'] as const,
        list: () => ['embeddings', 'list'] as const,
    },

    // Wildcards
    wildcards: {
        all: ['wildcards'] as const,
        list: () => ['wildcards', 'list'] as const,
    },

    // Server info
    server: {
        info: ['server', 'info'] as const,
        status: ['server', 'status'] as const,
    },
};
