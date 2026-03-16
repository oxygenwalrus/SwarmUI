/**
 * Simple token count estimator for CLIP-style tokenization
 * 
 * CLIP uses byte-pair encoding (BPE) which typically results in:
 * - Common words = 1 token
 * - Rare/long words = 2-4 tokens
 * - Punctuation = 1 token each
 * 
 * This is an approximation. For accurate counts, you'd need the actual tokenizer.
 * 
 * Rough formula: ~0.75 tokens per word for English text
 * CLIP's context window is typically 77 tokens (SD 1.x/2.x) or 225 (SDXL)
 */

export function estimateTokenCount(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    // Split on whitespace and commas (common prompt separator)
    const words = text.split(/[\s,]+/).filter(w => w.length > 0);

    let tokens = 0;

    for (const word of words) {
        // Count special characters as separate tokens
        const specialChars = (word.match(/[()[\]{}:;'"!?<>|\\/@#$%^&*+=~`]/g) || []).length;

        // Estimate word tokens based on length
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanWord.length === 0) {
            tokens += specialChars;
        } else if (cleanWord.length <= 3) {
            tokens += 1 + specialChars;
        } else if (cleanWord.length <= 6) {
            tokens += 1.5 + specialChars;
        } else if (cleanWord.length <= 10) {
            tokens += 2 + specialChars;
        } else {
            tokens += Math.ceil(cleanWord.length / 4) + specialChars;
        }
    }

    return Math.round(tokens);
}

export function getTokenWarning(tokenCount: number, model: 'sd15' | 'sdxl' = 'sdxl'): string | null {
    const limit = model === 'sdxl' ? 225 : 77;
    const warningThreshold = limit * 0.9;

    if (tokenCount >= limit) {
        return `⚠️ Token limit exceeded (${tokenCount}/${limit})`;
    } else if (tokenCount >= warningThreshold) {
        return `Approaching limit (${tokenCount}/${limit})`;
    }
    return null;
}

export const TOKEN_LIMITS = {
    sd15: 77,
    sdxl: 225,
} as const;
