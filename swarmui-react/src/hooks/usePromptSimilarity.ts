/**
 * usePromptSimilarity Hook
 * 
 * Detects when the current prompt is similar to a previously used prompt,
 * enabling "Quick Variation" mode that can reuse cached computation.
 */

import { useMemo, useCallback } from 'react';
import { usePromptCacheStore } from '../stores/promptCacheStore';

// ============================================================================
// Types
// ============================================================================

interface PromptSimilarityResult {
    /** Whether a similar prompt was found */
    hasSimilar: boolean;
    /** Whether quick generation mode is available (similarity > 85%) */
    canQuickGenerate: boolean;
    /** Similarity score 0-1 */
    similarity: number;
    /** Human-readable diff summary */
    diffSummary: string | null;
    /** Tokens that were added */
    addedTokens: string[];
    /** Tokens that were removed */
    removedTokens: string[];
    /** The original prompt this is similar to */
    originalPrompt: string | null;
    /** Add current prompt to cache */
    cachePrompt: () => void;
    /** Check if exact prompt is cached */
    isExactMatch: boolean;
}

interface UsePromptSimilarityOptions {
    /** Minimum similarity to consider as "similar" (default: 0.7) */
    similarityThreshold?: number;
    /** Minimum similarity for quick generate mode (default: 0.85) */
    quickGenerateThreshold?: number;
    /** Whether to auto-cache on generation (default: true) */
    autoCache?: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePromptSimilarity(
    currentPrompt: string,
    model: string,
    negativePrompt?: string,
    options: UsePromptSimilarityOptions = {}
): PromptSimilarityResult {
    const {
        similarityThreshold = 0.7,
        quickGenerateThreshold = 0.85,
    } = options;

    const { findSimilar, addEntry, hasPrompt } = usePromptCacheStore();

    // Find similar prompt in cache
    const similarityResult = useMemo(() => {
        if (!currentPrompt.trim() || !model) {
            return null;
        }
        return findSimilar(currentPrompt, model, similarityThreshold);
    }, [currentPrompt, model, similarityThreshold, findSimilar]);

    // Check for exact match
    const isExactMatch = useMemo(() => {
        if (!currentPrompt.trim() || !model) return false;
        return hasPrompt(currentPrompt, model);
    }, [currentPrompt, model, hasPrompt]);

    // Cache the current prompt
    const cachePrompt = useCallback(() => {
        if (!currentPrompt.trim() || !model) return;
        addEntry(currentPrompt, model, negativePrompt);
    }, [currentPrompt, model, negativePrompt, addEntry]);

    // Compute result
    const result = useMemo((): PromptSimilarityResult => {
        if (!similarityResult) {
            return {
                hasSimilar: false,
                canQuickGenerate: false,
                similarity: 0,
                diffSummary: null,
                addedTokens: [],
                removedTokens: [],
                originalPrompt: null,
                cachePrompt,
                isExactMatch,
            };
        }

        return {
            hasSimilar: true,
            canQuickGenerate: similarityResult.similarity >= quickGenerateThreshold,
            similarity: similarityResult.similarity,
            diffSummary: similarityResult.summary,
            addedTokens: similarityResult.addedTokens,
            removedTokens: similarityResult.removedTokens,
            originalPrompt: similarityResult.original.prompt,
            cachePrompt,
            isExactMatch,
        };
    }, [similarityResult, quickGenerateThreshold, cachePrompt, isExactMatch]);

    return result;
}

/**
 * Hook for tracking generation history and auto-caching
 */
export function usePromptCaching(
    prompt: string,
    model: string,
    negativePrompt?: string
) {
    const { addEntry, getLastPrompt } = usePromptCacheStore();

    // Cache prompt on generation
    const cacheOnGenerate = useCallback(() => {
        if (prompt.trim() && model) {
            addEntry(prompt, model, negativePrompt);
        }
    }, [prompt, model, negativePrompt, addEntry]);

    // Get last generated prompt
    const lastPrompt = useMemo(() => {
        return getLastPrompt();
    }, [getLastPrompt]);

    return {
        cacheOnGenerate,
        lastPrompt,
    };
}

export default usePromptSimilarity;
