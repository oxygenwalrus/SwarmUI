import { useCallback, useRef, useState } from 'react';
import { shouldReduceMotionForApp, shouldUsePageTransitions } from '../store/animationStore';

/**
 * Check if View Transitions API is supported
 */
export function supportsViewTransitions(): boolean {
  return 'startViewTransition' in document;
}

/**
 * ViewTransition interface (for TypeScript)
 */
interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

type ViewTransitionCallback = () => void | Promise<void>;

interface TransitionOptions {
  /** Skip transition if reduced motion is preferred */
  respectReducedMotion?: boolean;
}

/**
 * Custom hook for using View Transitions API with fallback
 * 
 * The View Transitions API provides native browser animations for DOM changes,
 * creating smooth visual transitions between states.
 * 
 * @example
 * const { startTransition } = useViewTransition();
 * 
 * const handlePageChange = (newPage: string) => {
 *   startTransition(() => {
 *     setCurrentPage(newPage);
 *   });
 * };
 */
export function useViewTransition(options: TransitionOptions = {}) {
  const { respectReducedMotion = true } = options;
  // Use state instead of ref so we can safely return it
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Keep a ref for synchronous checks within callbacks
  const isTransitioningRef = useRef(false);

  /**
   * Check if reduced motion is preferred
   */
  const prefersReducedMotion = useCallback(() => {
    if (!respectReducedMotion) return false;
    return shouldReduceMotionForApp() || !shouldUsePageTransitions();
  }, [respectReducedMotion]);

  /**
   * Start a view transition with the given callback
   */
  const startTransition = useCallback((updateCallback: ViewTransitionCallback): Promise<void> => {
    // If already transitioning, skip (use ref for sync check)
    if (isTransitioningRef.current) {
      updateCallback();
      return Promise.resolve();
    }

    // If View Transitions API not supported or reduced motion preferred, just run callback
    if (!supportsViewTransitions() || prefersReducedMotion()) {
      updateCallback();
      return Promise.resolve();
    }

    isTransitioningRef.current = true;
    setIsTransitioning(true);

    // Use the native View Transitions API
    const transition = (document as Document & {
      startViewTransition: (callback: ViewTransitionCallback) => ViewTransition
    }).startViewTransition(() => {
      const result = updateCallback();
      return result instanceof Promise ? result : Promise.resolve();
    });

    return transition.finished.finally(() => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    });
  }, [prefersReducedMotion]);

  /**
   * Start a transition with a named element (for shared element transitions)
   * Sets the view-transition-name on an element before transition, clears it after
   */
  const startNamedTransition = useCallback((
    element: HTMLElement | null,
    transitionName: string,
    updateCallback: ViewTransitionCallback
  ): Promise<void> => {
    if (!element) {
      return startTransition(updateCallback);
    }

    // Set the transition name before starting
    const originalName = element.style.viewTransitionName;
    element.style.viewTransitionName = transitionName;

    return startTransition(updateCallback).finally(() => {
      // Restore original (or clear)
      element.style.viewTransitionName = originalName || '';
    });
  }, [startTransition]);

  /**
   * Utility to set view-transition-name via CSS custom property
   * Use with .vt-gallery-item class that uses var(--vt-name)
   */
  const setTransitionName = useCallback((element: HTMLElement | null, name: string | null) => {
    if (!element) return;
    if (name) {
      element.style.setProperty('--vt-name', name);
    } else {
      element.style.removeProperty('--vt-name');
    }
  }, []);

  /**
   * Clear all view-transition-names (useful after transition completes)
   */
  const clearTransitionNames = useCallback(() => {
    document.querySelectorAll('[style*="view-transition-name"]').forEach((el) => {
      (el as HTMLElement).style.viewTransitionName = '';
    });
    document.querySelectorAll('[style*="--vt-name"]').forEach((el) => {
      (el as HTMLElement).style.removeProperty('--vt-name');
    });
  }, []);

  return {
    /** Start a view transition with automatic fallback */
    startTransition,
    /** Start a transition with a named element for shared element animations */
    startNamedTransition,
    /** Set view-transition-name via CSS custom property */
    setTransitionName,
    /** Clear all view-transition-names */
    clearTransitionNames,
    /** Whether View Transitions API is supported */
    isSupported: supportsViewTransitions(),
    /** Whether a transition is currently in progress */
    isTransitioning,
  };
}

/**
 * Utility function for one-off transitions without hook
 */
export function startViewTransition(callback: ViewTransitionCallback): Promise<void> {
  if (!supportsViewTransitions() || shouldReduceMotionForApp() || !shouldUsePageTransitions()) {
    callback();
    return Promise.resolve();
  }

  const transition = (document as Document & {
    startViewTransition: (cb: ViewTransitionCallback) => ViewTransition
  }).startViewTransition(callback);

  return transition.finished;
}

