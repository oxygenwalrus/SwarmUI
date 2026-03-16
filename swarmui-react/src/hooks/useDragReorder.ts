import { useState, useCallback, useRef } from 'react';

interface DragState {
    /** Index of item being dragged */
    dragIndex: number | null;
    /** Index item is being dragged over */
    hoverIndex: number | null;
}

interface UseDragReorderOptions<T> {
    /** Original items array */
    items: T[];
    /** Callback when items are reordered */
    onReorder: (newItems: T[]) => void;
    /** Optional key extractor for items */
    getKey?: (item: T, index: number) => string | number;
}

export interface DragHandlers {
    /** Handler for drag start */
    onDragStart: (index: number) => void;
    /** Handler for drag over */
    onDragOver: (e: React.DragEvent, index: number) => void;
    /** Handler for drag end */
    onDragEnd: () => void;
    /** Handler for drop */
    onDrop: (index: number) => void;
}

interface UseDragReorderReturn<T> extends DragState {
    /** Reordered items (live during drag) */
    orderedItems: T[];
    /** Get drag handlers for an item */
    getDragHandlers: (index: number) => {
        draggable: true;
        onDragStart: () => void;
        onDragOver: (e: React.DragEvent) => void;
        onDragEnd: () => void;
        onDrop: () => void;
    };
    /** Whether an item is being dragged */
    isDragging: boolean;
    /** Get style for item based on drag state */
    getItemStyle: (index: number) => React.CSSProperties;
}

/**
 * Hook for drag and drop list reordering.
 * Provides handlers and state for implementing drag-to-reorder functionality.
 */
export function useDragReorder<T>({
    items,
    onReorder,
}: UseDragReorderOptions<T>): UseDragReorderReturn<T> {
    const [dragState, setDragState] = useState<DragState>({
        dragIndex: null,
        hoverIndex: null,
    });

    const dragIndexRef = useRef<number | null>(null);

    const handleDragStart = useCallback((index: number) => {
        dragIndexRef.current = index;
        setDragState({ dragIndex: index, hoverIndex: null });
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
            setDragState(prev => ({ ...prev, hoverIndex: index }));
        }
    }, []);

    const handleDragEnd = useCallback(() => {
        dragIndexRef.current = null;
        setDragState({ dragIndex: null, hoverIndex: null });
    }, []);

    const handleDrop = useCallback((dropIndex: number) => {
        const dragIndex = dragIndexRef.current;

        if (dragIndex === null || dragIndex === dropIndex) {
            handleDragEnd();
            return;
        }

        // Reorder items
        const newItems = [...items];
        const [draggedItem] = newItems.splice(dragIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);

        onReorder(newItems);
        handleDragEnd();
    }, [items, onReorder, handleDragEnd]);

    const getDragHandlers = useCallback((index: number) => ({
        draggable: true as const,
        onDragStart: () => handleDragStart(index),
        onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
        onDragEnd: handleDragEnd,
        onDrop: () => handleDrop(index),
    }), [handleDragStart, handleDragOver, handleDragEnd, handleDrop]);

    const getItemStyle = useCallback((index: number): React.CSSProperties => {
        const { dragIndex, hoverIndex } = dragState;

        if (dragIndex === null) return {};

        if (index === dragIndex) {
            return {
                opacity: 0.5,
                transform: 'scale(1.02)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 10,
            };
        }

        if (index === hoverIndex) {
            return {
                transform: dragIndex < index ? 'translateY(-4px)' : 'translateY(4px)',
                transition: 'transform 150ms ease',
            };
        }

        return {};
    }, [dragState]);

    // Compute ordered items for preview during drag
    const orderedItems = items;

    return {
        ...dragState,
        orderedItems,
        getDragHandlers,
        isDragging: dragState.dragIndex !== null,
        getItemStyle,
    };
}
