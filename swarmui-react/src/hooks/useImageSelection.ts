import { useState, useCallback, useMemo } from 'react';

/**
 * Return type for the useImageSelection hook
 */
export interface UseImageSelectionReturn {
    /** Set of currently selected image IDs */
    selectedIds: Set<string>;
    /** Check if an image is selected */
    isSelected: (id: string) => boolean;
    /** Toggle selection for a single image */
    toggle: (id: string) => void;
    /** Select a range of images (for Shift+Click) */
    selectRange: (startId: string, endId: string, allIds: string[]) => void;
    /** Select all provided IDs */
    selectAll: (ids: string[]) => void;
    /** Clear all selections */
    clearSelection: () => void;
    /** Number of selected items */
    selectionCount: number;
    /** Whether selection mode is active */
    isSelectionMode: boolean;
    /** Enter selection mode */
    enterSelectionMode: () => void;
    /** Exit selection mode and clear selection */
    exitSelectionMode: () => void;
    /** Last selected ID for range selection */
    lastSelectedId: string | null;
    /** Set the last selected ID */
    setLastSelectedId: (id: string | null) => void;
}

/**
 * Hook for managing multi-select state in image galleries.
 * Provides toggle, range selection, select all, and clear functionality.
 * 
 * @example
 * ```tsx
 * const { 
 *   selectedIds, 
 *   isSelected, 
 *   toggle, 
 *   selectRange,
 *   isSelectionMode,
 *   enterSelectionMode 
 * } = useImageSelection();
 * 
 * // In click handler
 * const handleClick = (id: string, e: React.MouseEvent) => {
 *   if (e.shiftKey && lastSelectedId) {
 *     selectRange(lastSelectedId, id, allImageIds);
 *   } else {
 *     toggle(id);
 *   }
 * };
 * ```
 */
export function useImageSelection(): UseImageSelectionReturn {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    /**
     * Check if an image is currently selected
     */
    const isSelected = useCallback(
        (id: string): boolean => selectedIds.has(id),
        [selectedIds]
    );

    /**
     * Toggle selection for a single image
     */
    const toggle = useCallback((id: string): void => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
        setLastSelectedId(id);
    }, []);

    /**
     * Select a range of images between startId and endId (inclusive)
     * Uses allIds array to determine the order
     */
    const selectRange = useCallback(
        (startId: string, endId: string, allIds: string[]): void => {
            const startIndex = allIds.indexOf(startId);
            const endIndex = allIds.indexOf(endId);

            if (startIndex === -1 || endIndex === -1) {
                console.warn('[useImageSelection] Invalid range selection IDs');
                return;
            }

            const minIndex = Math.min(startIndex, endIndex);
            const maxIndex = Math.max(startIndex, endIndex);
            const rangeIds = allIds.slice(minIndex, maxIndex + 1);

            setSelectedIds((prev) => {
                const next = new Set(prev);
                rangeIds.forEach((id) => next.add(id));
                return next;
            });
            setLastSelectedId(endId);
        },
        []
    );

    /**
     * Select all provided IDs
     */
    const selectAll = useCallback((ids: string[]): void => {
        setSelectedIds(new Set(ids));
    }, []);

    /**
     * Clear all selections
     */
    const clearSelection = useCallback((): void => {
        setSelectedIds(new Set());
        setLastSelectedId(null);
    }, []);

    /**
     * Enter selection mode
     */
    const enterSelectionMode = useCallback((): void => {
        setIsSelectionMode(true);
    }, []);

    /**
     * Exit selection mode and clear all selections
     */
    const exitSelectionMode = useCallback((): void => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        setLastSelectedId(null);
    }, []);

    /**
     * Memoized selection count
     */
    const selectionCount = useMemo(() => selectedIds.size, [selectedIds]);

    return {
        selectedIds,
        isSelected,
        toggle,
        selectRange,
        selectAll,
        clearSelection,
        selectionCount,
        isSelectionMode,
        enterSelectionMode,
        exitSelectionMode,
        lastSelectedId,
        setLastSelectedId,
    };
}
