/**
 * useModelLoading Hook
 * 
 * Reactive hook for model loading with progress tracking.
 */

import { useCallback } from 'react';
import { useWebSocketStore } from '../stores/websocketStore';

export interface UseModelLoadingResult {
    // State
    isLoading: boolean;
    progress: number;
    modelName: string | null;
    loadingCount: number;
    isProgressEstimated: boolean;
    error: string | null;

    // Actions
    loadModel: (modelName: string) => void;
    clear: () => void;
}

/**
 * Hook for managing model loading with reactive progress updates.
 * 
 * @example
 * ```tsx
 * function ModelSelector({ models }) {
 *   const { isLoading, progress, loadModel } = useModelLoading();
 *   
 *   return (
 *     <Select
 *       data={models}
 *       onChange={loadModel}
 *       disabled={isLoading}
 *       rightSection={isLoading && <Loader size="xs" />}
 *     />
 *   );
 * }
 * ```
 */
export function useModelLoading(): UseModelLoadingResult {
    const modelLoading = useWebSocketStore((state) => state.modelLoading);
    const loadModelAction = useWebSocketStore((state) => state.loadModel);
    const clearModelLoading = useWebSocketStore((state) => state.clearModelLoading);

    const loadModel = useCallback(
        (modelName: string) => {
            loadModelAction(modelName);
        },
        [loadModelAction]
    );

    const clear = useCallback(() => {
        clearModelLoading();
    }, [clearModelLoading]);

    return {
        // State
        isLoading: modelLoading.isLoading,
        progress: modelLoading.progress,
        modelName: modelLoading.modelName,
        loadingCount: modelLoading.loadingCount,
        isProgressEstimated: modelLoading.isProgressEstimated,
        error: modelLoading.error,

        // Actions
        loadModel,
        clear,
    };
}
