import { useState, useEffect, useRef } from 'react';
import { swarmClient } from '../api/client';
import { estimateTokenCount } from '../utils/tokenCounter';
import { useSessionStore } from '../stores/session';

interface UseTokenCountOptions {
  debounceMs?: number;
  skipPromptSyntax?: boolean;
  tokenset?: string;
  weighting?: boolean;
}

interface UseTokenCountReturn {
  tokenCount: number;
  isEstimate: boolean;
  isLoading: boolean;
}

export function useTokenCount(
  text: string,
  options: UseTokenCountOptions = {}
): UseTokenCountReturn {
  const {
    debounceMs = 500,
    skipPromptSyntax = false,
    tokenset = 'clip',
    weighting = true,
  } = options;

  const isInitialized = useSessionStore((state) => state.isInitialized);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localEstimate = estimateTokenCount(text);

  useEffect(() => {
    setServerCount(null);

    if (!text.trim() || !isInitialized) {
      setServerCount(0);
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await swarmClient.countTokens({
          text,
          skipPromptSyntax,
          tokenset,
          weighting,
        });
        setServerCount(result.count);
      } catch {
        // Silently fall back to local estimate
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text, debounceMs, skipPromptSyntax, tokenset, weighting, isInitialized]);

  return {
    tokenCount: serverCount ?? localEstimate,
    isEstimate: serverCount === null,
    isLoading,
  };
}
