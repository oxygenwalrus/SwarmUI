/**
 * useGenerationStream Hook
 * 
 * Reactive hook for image generation with automatic state management.
 * Uses the centralized WebSocket store.
 */

import { useCallback } from 'react';
import { useWebSocketStore } from '../stores/websocketStore';
import type { GenerateParams } from '../api/types';

export interface UseGenerationStreamResult {
    // State
    isGenerating: boolean;
    progress: number;
    currentStep: number;
    totalSteps: number;
    previewImage: string | null;
    images: string[];
    error: string | null;
    startTime: number | null;

    // Actions
    generate: (params: GenerateParams) => void;
    stop: () => void;
    clear: () => void;
}

/**
 * Hook for managing image generation with reactive state updates.
 * 
 * @example
 * ```tsx
 * function GenerateButton() {
 *   const { isGenerating, progress, generate, stop } = useGenerationStream();
 *   
 *   return (
 *     <div>
 *       <button onClick={() => generate({ prompt: 'a cat' })} disabled={isGenerating}>
 *         Generate
 *       </button>
 *       {isGenerating && <ProgressBar value={progress} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGenerationStream(): UseGenerationStreamResult {
    const generation = useWebSocketStore((state) => state.generation);
    const startGeneration = useWebSocketStore((state) => state.startGeneration);
    const stopGeneration = useWebSocketStore((state) => state.stopGeneration);
    const clearGeneration = useWebSocketStore((state) => state.clearGeneration);

    const generate = useCallback(
        (params: GenerateParams) => {
            startGeneration(params);
        },
        [startGeneration]
    );

    const stop = useCallback(() => {
        stopGeneration();
    }, [stopGeneration]);

    const clear = useCallback(() => {
        clearGeneration();
    }, [clearGeneration]);

    return {
        // State
        isGenerating: generation.isGenerating,
        progress: generation.progress,
        currentStep: generation.currentStep,
        totalSteps: generation.totalSteps,
        previewImage: generation.previewImage,
        images: generation.images,
        error: generation.error,
        startTime: generation.startTime,

        // Actions
        generate,
        stop,
        clear,
    };
}
